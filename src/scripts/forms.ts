import { bindFieldControls } from "./field-controls";
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
      if (window.turnstile) resolve();
      else {
        script.remove();
        captchaLoader = undefined;
        reject(
          new Error("Unable to load security verification. Please retry."),
        );
      }
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
export type CaptchaChallenge = {
  token?: string;
  cleanup: () => void;
};
export async function freshCaptcha(
  form: HTMLFormElement,
): Promise<CaptchaChallenge> {
  if (form.dataset.captchaEnabled !== "true" || !form.dataset.captcha)
    return { cleanup: () => {} };
  if (!form.dataset.siteKey)
    throw new Error("Security verification is unavailable. Contact support.");
  await loadCaptcha();
  const container = form.querySelector<HTMLElement>("[data-captcha-container]");
  if (!container)
    throw new Error("Security verification is unavailable. Contact support.");
  return new Promise((resolve, reject) => {
    let widget: string | undefined;
    let settled = false;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned || widget === undefined) return;
      cleaned = true;
      // Siteverify consumes a token once. Retain this form's widget until the
      // protected request finishes, then reset/remove it before enabling retry.
      try {
        window.turnstile?.reset(widget);
      } catch {
        // Cleanup must not change the protected request's result.
      }
      try {
        window.turnstile?.remove(widget);
      } catch {
        container.replaceChildren();
      }
    };
    const finish = (error?: string, token?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        // Also handles a callback fired synchronously inside render().
        queueMicrotask(cleanup);
        reject(new Error(error));
      } else resolve({ token, cleanup });
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
        "response-field": false,
        retry: "never",
        "refresh-expired": "never",
        "refresh-timeout": "never",
        callback: (token: string) =>
          typeof token === "string" && token.trim() && token.length <= 2048
            ? finish(undefined, token)
            : finish("Security verification failed. Please retry."),
        "error-callback": (code: string) => {
          const configurationErrors: Record<string, string> = {
            "110100":
              "Security verification is misconfigured. Contact support.",
            "110110":
              "Security verification is misconfigured. Contact support.",
            "110200":
              "Security verification is not enabled for this website address. Contact support.",
            "400020":
              "Security verification is misconfigured. Contact support.",
            "400070": "Security verification is unavailable. Contact support.",
          };
          const message =
            configurationErrors[code] ??
            (code === "200500"
              ? "Unable to load security verification. Check your connection or content blocker and retry."
              : "Security verification failed. Please retry.");
          finish(message + (/^\d{6}$/.test(code) ? ` (${code})` : ""));
          return true;
        },
        "expired-callback": () =>
          finish("Security verification expired. Please retry."),
        "timeout-callback": () =>
          finish("Security verification timed out. Please retry."),
      });
      if (!settled) window.turnstile!.execute(widget);
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
  if (result.signedOut) {
    broadcast("logout");
    window.dispatchEvent(new Event("salam-logout"));
  }
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
  element.dataset.loading = String(state === "pending");
  element.hidden = false;
  element.textContent = text;
  element.className = "form-message " + (state === "error" ? "" : state);
  element.setAttribute("role", state === "error" ? "alert" : "status");
}
export function bindForms() {
  bindFieldControls();
  document
    .querySelectorAll<HTMLFormElement>("form[data-api-form]")
    .forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = "true";
      let originalRequest: Record<string, FormDataEntryValue> | undefined;
      form.addEventListener("submit", async (event) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (form.dataset.busy === "true" || !form.reportValidity()) return;
        form.dataset.busy = "true";
        let data = Object.fromEntries(new FormData(form).entries());
        form
          .querySelectorAll<HTMLInputElement>("[data-date-field]")
          .forEach((input) => {
            if (input.name && input.value)
              data[input.name] = new Date(input.value).toISOString();
          });
        if (form.dataset.businessRetry === "true") {
          originalRequest ??= { ...data };
          data = { ...originalRequest };
          form
            .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
              "input:not([type=hidden]),textarea",
            )
            .forEach((input) => (input.readOnly = true));
        }
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
        let challenge: CaptchaChallenge | undefined;
        try {
          challenge = await freshCaptcha(form);
          if (challenge.token) data.captcha_token = challenge.token;
          const result = await post(form.getAttribute("action")!, data);
          const redirect = result.redirect
            ? new URL(result.redirect, location.origin)
            : null;
          if (
            redirect &&
            redirect.origin === location.origin &&
            (redirect.pathname.startsWith("/") ||
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
          form.dispatchEvent(
            new CustomEvent("salam-form-error", {
              detail: {
                code: error instanceof ApiError ? error.code : undefined,
              },
            }),
          );
          if (
            form.dataset.businessRetry === "true" &&
            error instanceof ApiError &&
            error.status < 500
          ) {
            originalRequest = undefined;
            form
              .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                "input:not([type=hidden]),textarea",
              )
              .forEach((input) => (input.readOnly = false));
          }
          if (
            (form.action.endsWith("/company-create") ||
              form.dataset.nonIdempotent === "true") &&
            (!(error instanceof ApiError) || error.status >= 500)
          ) {
            form.dataset.creationUncertain = "true";
            message(
              form,
              form.dataset.nonIdempotent === "true"
                ? "Submission could not be confirmed. Check the current records before submitting again."
                : "Creation could not be confirmed. Check Account and your company selector before creating another company.",
              "error",
            );
            const link = document.createElement("a");
            link.href = form.dataset.checkHref ?? "/account";
            link.className = "text-link";
            link.textContent =
              form.dataset.nonIdempotent === "true"
                ? "Check current records"
                : "Check your companies";
            form.append(link);
            return;
          }
          message(
            form,
            error instanceof Error
              ? error.message +
                  (originalRequest
                    ? " Retry here to confirm the original submission."
                    : "")
              : "Unable to complete this request. Please retry.",
            "error",
          );
        } finally {
          challenge?.cleanup();
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
