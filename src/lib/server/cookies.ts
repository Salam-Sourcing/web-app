import type { APIContext } from "astro";
import { parseCookieHeader } from "@supabase/ssr";

export function clearLocalSession(context: APIContext) {
  const names = parseCookieHeader(
    context.request.headers.get("cookie") ?? "",
  ).map(({ name }) => name);
  for (const name of new Set([...names, "ss-auth", "ss-auth-code-verifier"])) {
    if (
      name.startsWith("ss-auth") ||
      name.startsWith("ss-company-") ||
      name.startsWith("ss-upload-") ||
      name === "ss-intent" ||
      name === "ss-next" ||
      name === "ss-push-token"
    )
      context.cookies.delete(name, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: context.url.protocol === "https:",
      });
  }
}
