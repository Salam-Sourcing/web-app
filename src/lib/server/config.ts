import { allowedBackend } from "../backend-config";
import { getSecret } from "astro:env/server";
import { authCallbackUrl } from "../auth-callback";
const buildValues: Record<string, string | undefined> = {
  SUPABASE_URL: import.meta.env.SUPABASE_URL,
  SALAM_UI_TEST_BACKEND: import.meta.env.SALAM_UI_TEST_BACKEND,
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.SUPABASE_PUBLISHABLE_KEY,
  SITE_URL: import.meta.env.SITE_URL,
  AUTH_CAPTCHA_ENABLED: import.meta.env.AUTH_CAPTCHA_ENABLED,
  TURNSTILE_SITE_KEY: import.meta.env.TURNSTILE_SITE_KEY,
};
function value(name: string): string {
  return getSecret(name) ?? buildValues[name] ?? "";
}
export function serverConfig() {
  const url = value("SUPABASE_URL");
  const key = value("SUPABASE_PUBLISHABLE_KEY");
  // Fail closed; a privileged legacy JWT must never be accepted as customer config.
  const configured = allowedBackend(
    url,
    key,
    import.meta.env.DEV,
    value("SALAM_UI_TEST_BACKEND") === "true",
  );
  return {
    url,
    key,
    configured,
    siteUrl: value("SITE_URL") || "https://test.salamsourcing.com",
    captchaEnabled: value("AUTH_CAPTCHA_ENABLED") !== "false",
    siteKey: value("TURNSTILE_SITE_KEY"),
  };
}
export function callbackUrl(
  request: Request,
  flow: "signup" | "recovery" | "email_change",
  state: string,
) {
  return authCallbackUrl(
    request.url,
    serverConfig().siteUrl,
    flow,
    state,
    import.meta.env.DEV,
  );
}
