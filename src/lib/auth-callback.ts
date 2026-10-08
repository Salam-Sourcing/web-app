import { AccessError } from "./security";

/** Use only the configured origin. LAN HTTP callbacks are development-only. */
export function authCallbackUrl(
  requestUrl: string,
  siteUrl: string,
  flow: "signup" | "recovery" | "email_change",
  state: string,
  development = false,
): string {
  const unavailable = () =>
    new AccessError(
      503,
      "origin_configuration",
      "This website's sign-in configuration needs attention. Contact support.",
    );
  let site: URL;
  let request: URL;
  try {
    site = new URL(siteUrl);
    request = new URL(requestUrl);
  } catch {
    throw unavailable();
  }
  const localDevelopment =
    development &&
    site.protocol === "http:" &&
    (["localhost", "127.0.0.1", "[::1]"].includes(site.hostname) ||
      /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.local$/.test(site.hostname));
  if (
    site.origin !== request.origin ||
    site.username ||
    site.password ||
    (site.protocol !== "https:" && !localDevelopment)
  ) {
    throw unavailable();
  }
  const callback = new URL("/auth/callback", site.origin);
  callback.searchParams.set("flow", flow);
  callback.searchParams.set("state", state);
  return callback.href;
}
