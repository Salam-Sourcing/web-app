import { isPrivatePath, cleanLegacyPath } from "./lib/routes";
import { defineMiddleware } from "astro:middleware";
import { createRequestClient } from "./lib/server/supabase";
import { requireWorkspace } from "./lib/server/access";
import { AccessError, errorResponse, safeNext } from "./lib/security";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.authHeaders = new Headers();
  context.locals.supabase = createRequestClient(context);
  const path = context.url.pathname;
  let response: Response;
  try {
    if (/^\/app(?:\/|$)/.test(path)) {
      response = context.redirect(
        cleanLegacyPath(path) + context.url.search,
        308,
      );
    } else {
      if (isPrivatePath(path)) await requireWorkspace(context);
      response = await next();
    }
  } catch (error) {
    if (path.startsWith("/api/")) response = errorResponse(error);
    else if (error instanceof AccessError && error.redirect)
      response = context.redirect(
        `${error.redirect}?next=${encodeURIComponent(safeNext(path + context.url.search))}`,
        303,
      );
    else
      response = context.redirect(
        "/auth/access?reason=" +
          (error instanceof AccessError
            ? encodeURIComponent(error.code)
            : "access_unavailable"),
        303,
      );
  }
  const headers = response.headers;
  for (const [name, value] of context.locals.authHeaders)
    headers.set(name, value);
  const sensitive =
    isPrivatePath(path) ||
    /^\/(app|api|auth)(\/|$)/.test(path) ||
    ["/login", "/signup", "/forgot-password", "/verify-email"].includes(path) ||
    context.locals.authHeaders.has("cache-control");
  if (sensitive || headers.has("set-cookie")) {
    headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  // Only authenticated PDF exports explicitly permit their same-origin preview.
  headers.set(
    "X-Frame-Options",
    headers.get("Content-Type") === "application/pdf" &&
      headers.get("X-Frame-Options") === "SAMEORIGIN"
      ? "SAMEORIGIN"
      : "DENY",
  );
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Preserve Astro's generated script/style hashes on production HTML.
  // APIs, redirects and development responses receive a fallback.
  if (!headers.has("Content-Security-Policy"))
    headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
    );
  if (context.url.protocol === "https:")
    headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
});
