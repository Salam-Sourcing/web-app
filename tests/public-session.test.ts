import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import { AccessError } from "../src/lib/security.ts";
import {
  publicWorkspace,
  signedInHomeRedirect,
} from "../src/lib/server/public-session.ts";

function context(cookie?: string) {
  return {
    request: new Request(
      "https://test.salamsourcing.com/?next=https://example.invalid",
      { headers: cookie ? { cookie } : {} },
    ),
    locals: { authHeaders: new Headers() },
    redirect: (path: string, status: number) =>
      new Response(null, { status, headers: { location: path } }),
  } as unknown as APIContext;
}
const verified = {} as Workspace;
for (const cookie of [
  undefined,
  "ss-auth-flow=signup; unrelated=ss-auth=value",
]) {
  test("guest home does not resolve access for " + String(cookie), async () => {
    let calls = 0;
    const ctx = context(cookie);
    assert.equal(
      await signedInHomeRedirect(ctx, async () => {
        calls++;
        return verified;
      }),
      null,
    );
    assert.equal(calls, 0);
    assert.equal(ctx.locals.authHeaders.has("cache-control"), false);
  });
}
for (const cookie of [
  "ss-auth=session",
  "ss-auth.0=chunk0; ss-auth.1=chunk1",
]) {
  test(
    "verified session redirects home directly to Discover with " +
      cookie.split("=")[0],
    async () => {
      const ctx = context(cookie);
      let calls = 0;
      const response = await signedInHomeRedirect(ctx, async () => {
        calls++;
        return verified;
      });
      assert.equal(calls, 1);
      assert.equal(response?.status, 303);
      assert.equal(response?.headers.get("location"), "/discover");
      assert.equal(
        ctx.locals.authHeaders.get("cache-control"),
        "private, no-store",
      );
      assert.equal(
        ctx.locals.authHeaders.get("cloudflare-cdn-cache-control"),
        "no-store",
      );
    },
  );
}
test("an expired session can use guest home, with no shared cached auth response", async () => {
  const ctx = context("ss-auth=expired");
  const response = await signedInHomeRedirect(ctx, async () => {
    throw new AccessError(401, "sign_in_required", "Sign in again.", "/login");
  });
  assert.equal(response, null);
  assert.equal(
    ctx.locals.authHeaders.get("cache-control"),
    "private, no-store",
  );
});
test("security and service gates never become a signed-in redirect or guest fallback", async () => {
  for (const error of [
    new AccessError(403, "mfa_required", "Verify authenticator.", "/auth/mfa"),
    new AccessError(403, "account_unavailable", "Unavailable."),
    new AccessError(503, "access_unavailable", "Try again."),
  ]) {
    const ctx = context("ss-auth=session");
    await assert.rejects(
      () =>
        signedInHomeRedirect(ctx, async () => {
          throw error;
        }),
      (e) => e === error,
    );
    assert.equal(
      ctx.locals.authHeaders.get("cache-control"),
      "private, no-store",
    );
  }
});
test("verified navigation state is reused by public headers and footers", async () => {
  const ctx = context();
  ctx.locals.workspace = verified;
  assert.equal(await publicWorkspace(ctx, async () => verified), verified);
  assert.equal(
    ctx.locals.authHeaders.get("cache-control"),
    "private, no-store",
  );
});
