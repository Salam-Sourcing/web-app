import { getSecret } from "astro:env/server";
import { AccessError } from "../security";
const buildValues: Record<string, string | undefined> = {
  SUPABASE_URL: import.meta.env.SUPABASE_URL,
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
  const configured =
    /^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
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
  flow: "signup" | "recovery",
  state: string,
) {
  const config = serverConfig();
  const site = new URL(config.siteUrl);
  if (
    site.origin !== new URL(request.url).origin ||
    (site.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(site.hostname))
  ) {
    throw new AccessError(
      503,
      "origin_configuration",
      "This website's sign-in configuration needs attention. Contact support.",
    );
  }
  const url = new URL("/auth/callback", site.origin);
  url.searchParams.set("flow", flow);
  url.searchParams.set("state", state);
  return url.href;
}
