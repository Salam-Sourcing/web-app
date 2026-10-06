type SessionStatus = {
  fingerprint?: string;
  redirect?: string;
  error?: string;
};
type BoundaryDependencies = {
  initial: string;
  now: () => number;
  visible: () => boolean;
  hasContent: () => boolean;
  load: (signal: AbortSignal) => Promise<Response>;
  lock: (message: string) => void;
  unlock: () => void;
  discard: () => void;
  reload: () => void;
  redirect: (path: string) => void;
};
const CHECK_INTERVAL = 30_000;
const MAX_FRESH_AGE = 60_000;

// Fresh HTML has already passed the server's session, MFA and company guards.
// Routine checks preserve that page while revalidating in the background.
export function createBoundaryGuard(deps: BoundaryDependencies) {
  let verifiedAt = deps.now();
  let locked = false;
  let checking = false;
  let disposed = false;
  let epoch = 0;
  let controller: AbortController | undefined;
  const lock = (message: string) => {
    locked = true;
    deps.lock(message);
  };
  const cancel = () => {
    epoch++;
    controller?.abort();
    controller = undefined;
    checking = false;
  };
  const leave = () => {
    disposed = true;
    cancel();
    deps.discard();
  };
  const invalidate = (path?: string) => {
    leave();
    if (path) deps.redirect(path);
    else deps.reload();
  };
  const check = async (force = false) => {
    if (disposed || !deps.visible()) return;
    const age = deps.now() - verifiedAt;
    if (!locked && age < MAX_FRESH_AGE) deps.unlock();
    if (!locked && age >= MAX_FRESH_AGE)
      lock("Please wait while we verify your session.");
    if (checking || (!force && !locked && age < CHECK_INTERVAL)) return;
    checking = true;
    if (locked) lock("Please wait while we verify your session.");
    const requestEpoch = epoch;
    controller = new AbortController();
    try {
      const response = await deps.load(
        AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      );
      const result = (await response.json()) as SessionStatus;
      // A late request must never reveal a page after logout, offline or navigation.
      if (disposed || requestEpoch !== epoch) return;
      if (!response.ok) {
        if (result.redirect === "/login" || result.redirect === "/auth/mfa") {
          invalidate(result.redirect);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          lock(result.error ?? "Your account access could not be verified.");
          deps.discard();
          return;
        }
        throw new Error("Unable to verify access.");
      }
      if (
        !result.fingerprint ||
        result.fingerprint !== deps.initial ||
        !deps.hasContent()
      ) {
        invalidate();
        return;
      }
      verifiedAt = deps.now();
      locked = false;
      deps.unlock();
    } catch {
      if (!disposed && requestEpoch === epoch)
        lock("Unable to verify access. Connect to the internet and retry.");
    } finally {
      if (requestEpoch === epoch) {
        checking = false;
        controller = undefined;
      }
    }
  };
  return {
    check,
    leave,
    invalidate,
    offline: () => {
      if (disposed) return;
      cancel();
      lock("You are offline. Connect to the internet and retry.");
    },
  };
}

export function bindBoundary() {
  const content = document.querySelector<HTMLElement>("#private-content");
  const overlay = document.querySelector<HTMLElement>("#boundary-overlay");
  const message = document.querySelector<HTMLElement>("#boundary-message");
  if (!content || !overlay || content.dataset.boundaryBound) return;
  content.dataset.boundaryBound = "true";
  const guard = createBoundaryGuard({
    initial: content.dataset.fingerprint ?? "",
    now: () => Date.now(),
    visible: () => !document.hidden,
    hasContent: () => content.hasChildNodes(),
    load: (signal) =>
      fetch("/api/session", {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal,
      }),
    lock: (text) => {
      content.hidden = true;
      overlay.hidden = false;
      if (message) message.textContent = text;
    },
    unlock: () => {
      content.hidden = document.hidden;
      overlay.hidden = true;
    },
    discard: () => {
      content.hidden = true;
      overlay.hidden = false;
      content.replaceChildren();
    },
    reload: () => location.reload(),
    redirect: (path) => location.replace(path),
  });
  // Keep hidden-tab previews private without presenting a modal on a fresh return.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) content.hidden = true;
    else void guard.check();
  });
  window.addEventListener("focus", () => void guard.check());
  window.addEventListener("offline", guard.offline);
  window.addEventListener("online", () => void guard.check(true));
  document
    .querySelector("#boundary-retry")
    ?.addEventListener("click", () => void guard.check(true));
  const timer = window.setInterval(
    () => void guard.check(true),
    CHECK_INTERVAL,
  );
  let channel: BroadcastChannel | undefined;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel("salam-account-boundary");
    channel.onmessage = (event) => {
      if (event.data?.kind === "logout") guard.invalidate("/login");
      else if (event.data?.kind === "context") guard.invalidate();
    };
  }
  // A cached document never restores private DOM; fresh HTML passes server guards.
  window.addEventListener(
    "pagehide",
    () => {
      guard.leave();
      clearInterval(timer);
      channel?.close();
    },
    { once: true },
  );
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) guard.invalidate();
  });
  // No immediate duplicate check: this document was just verified on the server.
  if (!navigator.onLine) guard.offline();
}
