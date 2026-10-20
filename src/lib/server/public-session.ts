import type { APIContext } from "astro";
import { AccessError } from "../security";
import { requireWorkspace } from "./access";

/** Resolve verified access for public navigation without trusting cookie presence. */
export async function publicWorkspace(
  context: APIContext,
  resolveWorkspace: typeof requireWorkspace = requireWorkspace,
) {
  const cookies = context.request.headers.get("cookie") ?? "";
  if (
    !context.locals.workspace &&
    !/(?:^|;\s*)ss-auth(?:\.\d+)?=/.test(cookies)
  )
    return null;
  context.locals.authHeaders.set("Cache-Control", "private, no-store");
  context.locals.authHeaders.set("Cloudflare-CDN-Cache-Control", "no-store");
  try {
    return await resolveWorkspace(context);
  } catch (error) {
    // Expired/missing sessions can still browse the guest homepage. Access,
    // security-factor and service errors must retain the normal access gate.
    if (error instanceof AccessError && error.code === "sign_in_required")
      return null;
    throw error;
  }
}

export async function signedInHomeRedirect(
  context: APIContext,
  resolveWorkspace: typeof requireWorkspace = requireWorkspace,
) {
  return (await publicWorkspace(context, resolveWorkspace))
    ? context.redirect("/discover", 303)
    : null;
}
