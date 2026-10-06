export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
type ApiResult = {
  error?: string;
  message?: string;
  redirect?: string;
  signedOut?: boolean;
  companyChanged?: boolean;
  contextChanged?: boolean;
  [key: string]: unknown;
};
declare global {
  interface Window {
    turnstile?: {
      render: (node: HTMLElement, options: Record<string, unknown>) => string;
      execute: (id: string) => void;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
let captchaLoader: Promise<void> | undefined;
function loadCaptcha(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (captchaLoader) return captchaLoader;
  captchaLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = window.setTimeout(() => {
      script.remove();
      captchaLoader = undefined;
      reject(new Error("Security verification timed out. Please retry."));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      captchaLoader = undefined;
      reject(new Error("Unable to load security verification. Please retry."));
    };
    document.head.append(script);
  });
  return captchaLoader;
}
async function freshCaptcha(
  form: HTMLFormElement,
): Promise<string | undefined> {
  if (form.dataset.captchaEnabled !== "true" || !form.dataset.captcha)
    return undefined;
  if (!form.dataset.siteKey)
    throw new Error("Security verification is unavailable. Contact support.");
  await loadCaptcha();
  const container = form.querySelector<HTMLElement>(
    "[data-captcha-container]",
  )!;
  return new Promise((resolve, reject) => {
    let widget: string | undefined;
    let settled = false;
    const finish = (error?: string, token?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (widget) window.turnstile?.remove(widget);
      if (error) reject(new Error(error));
      else resolve(token);
    };
    const timer = window.setTimeout(
      () => finish("Security verification expired. Please try again."),
      60000,
    );
    try {
      widget = window.turnstile!.render(container, {
        sitekey: form.dataset.siteKey,
        action: form.dataset.captcha,
        size: "compact",
        execution: "execute",
        callback: (token: string) =>
          token && token.length <= 2048
            ? finish(undefined, token)
            : finish("Security verification failed. Please retry."),
        "error-callback": () => {
          finish("Security verification failed. Please retry.");
          return true;
        },
        "expired-callback": () =>
          finish("Security verification expired. Please retry."),
        "timeout-callback": () =>
          finish("Security verification timed out. Please retry."),
      });
      window.turnstile!.execute(widget);
    } catch {
      finish("Unable to start security verification. Please retry.");
    }
  });
}
export function broadcast(kind: "logout" | "context") {
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("salam-account-boundary");
    channel.postMessage({ kind });
    channel.close();
  }
}
export async function post(
  url: string,
  data: Record<string, unknown>,
): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify(data),
  });
  const result = (await response.json()) as ApiResult;
  if (!response.ok) {
    if (
      result.redirect &&
      (result.redirect === "/login" || result.redirect === "/auth/mfa")
    )
      location.replace(result.redirect);
    throw new ApiError(
      result.error ?? "Unable to complete this request. Please retry.",
      response.status,
      String(result.code ?? ""),
    );
  }
  if (result.signedOut) broadcast("logout");
  if (result.companyChanged || result.contextChanged) broadcast("context");
  return result;
}
function message(
  form: HTMLFormElement,
  text: string,
  state: "pending" | "success" | "error",
) {
  const element = form.querySelector<HTMLElement>("[data-form-message]");
  if (!element) return;
  element.hidden = false;
  element.textContent = text;
  element.className = "form-message " + (state === "error" ? "" : state);
  element.setAttribute("role", state === "error" ? "alert" : "status");
}
export function bindForms() {
  document
    .querySelectorAll<HTMLFormElement>("form[data-api-form]")
    .forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = "true";
      form.addEventListener("submit", async (event) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (form.dataset.busy === "true" || !form.reportValidity()) return;
        form.dataset.busy = "true";
        const data = Object.fromEntries(new FormData(form).entries());
        form
          .querySelectorAll<HTMLInputElement>("[data-date-field]")
          .forEach((input) => {
            if (input.name && input.value)
              data[input.name] = new Date(input.value).toISOString();
          });
        const buttons = Array.from(
          form.querySelectorAll<HTMLButtonElement>("button"),
        );
        buttons.forEach((button) => (button.disabled = true));
        form.setAttribute("aria-busy", "true");
        message(
          form,
          form.dataset.captcha
            ? "Completing security verification…"
            : "Working…",
          "pending",
        );
        try {
          const token = await freshCaptcha(form);
          if (token) data.captcha_token = token;
          const result = await post(form.getAttribute("action")!, data);
          const redirect = result.redirect
            ? new URL(result.redirect, location.origin)
            : null;
          if (
            redirect &&
            redirect.origin === location.origin &&
            (redirect.pathname.startsWith("/app/") ||
              redirect.pathname.startsWith("/auth/") ||
              ["/login", "/verify-email"].includes(redirect.pathname))
          ) {
            if (
              form.action.endsWith("/login") ||
              form.action.endsWith("/signup")
            )
              broadcast("context");
            location.assign(redirect.href);
          } else {
            message(
              form,
              result.message ?? "Your changes were saved.",
              "success",
            );
            if (form.action.endsWith("/report")) form.reset();
          }
        } catch (error) {
          if (
            (form.action.endsWith("/company-create") ||
              form.dataset.nonIdempotent === "true") &&
            (!(error instanceof ApiError) || error.status >= 500)
          ) {
            form.dataset.creationUncertain = "true";
            message(
              form,
              form.dataset.nonIdempotent === "true"
                ? "Submission could not be confirmed. Check the enquiry before submitting another quote."
                : "Creation could not be confirmed. Check Account and your company selector before creating another company.",
              "error",
            );
            const link = document.createElement("a");
            link.href = form.dataset.checkHref ?? "/app/account";
            link.className = "text-link";
            link.textContent =
              form.dataset.nonIdempotent === "true"
                ? "Check the enquiry"
                : "Check your companies";
            form.append(link);
            return;
          }
          message(
            form,
            error instanceof Error
              ? error.message
              : "Unable to complete this request. Please retry.",
            "error",
          );
        } finally {
          form.dataset.busy = "false";
          form.removeAttribute("aria-busy");
          buttons.forEach(
            (button) =>
              (button.disabled = form.dataset.creationUncertain === "true"),
          );
        }
      });
    });
}
