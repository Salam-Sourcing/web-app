import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { APIContext } from "astro";
import type { Database } from "../database.types";
import { serverConfig } from "./config";

export function createRequestClient(context: APIContext) {
  const config = serverConfig();
  if (!config.configured) return null;
  const jar = new Map(
    parseCookieHeader(context.request.headers.get("cookie") ?? "").map(
      ({ name, value }) => [name, value ?? ""],
    ),
  );
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      name: "ss-auth",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(15000),
        }),
    },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies, headers) => {
        for (const { name, value, options } of cookies) {
          jar.set(name, value);
          // Host-only cookies; the browser never needs to read tokens or PKCE secrets.
          context.cookies.set(name, value, {
            ...options,
            domain: undefined,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: context.url.protocol === "https:",
            // Auth/PKCE cookies are browser-session cookies; deletion retains expiry.
            ...(value
              ? { maxAge: undefined, expires: undefined }
              : { maxAge: 0, expires: new Date(0) }),
          });
        }
        for (const [name, value] of Object.entries(headers))
          context.locals.authHeaders.set(name, value);
      },
    },
  });
}
