import { test } from "node:test";
import assert from "node:assert/strict";
import { authCallbackUrl } from "../src/lib/auth-callback.ts";
import { AccessError } from "../src/lib/security.ts";
const local = "http://karamullahs-mac-mini.local:4321";
const deployed = "https://test.salamsourcing.com";
const denied = (request: string, site: string, development = false) => {
  assert.throws(
    () => authCallbackUrl(request, site, "signup", "state", development),
    (error: unknown) =>
      error instanceof AccessError &&
      error.status === 503 &&
      error.code === "origin_configuration",
  );
};
for (const flow of ["signup", "recovery", "email_change"] as const) {
  test(`${flow} returns to the configured Mac mini origin in development`, () => {
    const callback = new URL(
      authCallbackUrl(
        `${local}/api/auth/${flow}`,
        local,
        flow,
        "a state&with?reserved=characters",
        true,
      ),
    );
    assert.equal(callback.origin, local);
    assert.equal(callback.pathname, "/auth/callback");
    assert.equal(callback.searchParams.get("flow"), flow);
    assert.equal(
      callback.searchParams.get("state"),
      "a state&with?reserved=characters",
    );
  });
}
test("deployed callbacks require HTTPS even for local hostnames", () => {
  denied(`${local}/api/auth/signup`, local);
  for (const site of [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "http://[::1]:4321",
    "http://test.salamsourcing.com",
  ])
    denied(`${site}/api/auth/signup`, site);
  assert.equal(
    new URL(
      authCallbackUrl(
        `${deployed}/api/auth/signup`,
        deployed,
        "signup",
        "bound-state",
      ),
    ).origin,
    deployed,
  );
});
test("development accepts an explicitly configured loopback but refuses arbitrary HTTP websites and LAN IPs", () => {
  for (const site of [
    "http://localhost:4341",
    "http://127.0.0.1:4341",
    "http://[::1]:4341",
  ])
    assert.equal(
      new URL(
        authCallbackUrl(
          `${site}/api/auth/reset`,
          site,
          "recovery",
          "state",
          true,
        ),
      ).origin,
      site,
    );
  for (const site of [
    "http://example.com",
    "http://local.example.com",
    "http://192.168.1.229:4321",
    "http://local",
    "ftp://karamullahs-mac-mini.local:4321",
  ])
    denied(`${site}/api/auth/signup`, site, true);
});
test("callbacks reject a different request hostname, scheme or port in every environment", () => {
  for (const development of [false, true]) {
    denied("http://attacker.local:4321/api/auth/signup", local, development);
    denied("http://localhost:4321/api/auth/signup", local, development);
    denied(
      "https://karamullahs-mac-mini.local:4321/api/auth/signup",
      local,
      development,
    );
    denied(
      "http://karamullahs-mac-mini.local:4341/api/auth/signup",
      local,
      development,
    );
    denied("https://attacker.example/api/auth/signup", deployed, development);
  }
});
test("malformed or credential-bearing site configuration fails with an actionable configuration error", () => {
  denied(`${local}/api/auth/signup`, "invalid", true);
  denied("invalid", local, true);
  denied(
    `${deployed}/api/auth/signup`,
    "https://user:password@test.salamsourcing.com",
  );
});
