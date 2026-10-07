import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import {
  handleAuthAction,
  type AuthConfig,
} from "../src/lib/server/auth-actions.ts";
import { clearLocalSession } from "../src/lib/server/cookies.ts";
import { type Client } from "../src/lib/server/access.ts";
import { AccessError } from "../src/lib/security.ts";
import { POST as safety } from "../src/pages/api/safety/[action].ts";

type Call = { name: string; args?: any };
const verified = {
  id: "verified-own",
  factor_type: "totp",
  status: "verified",
};
const abandoned = {
  id: "unverified-own",
  factor_type: "totp",
  status: "unverified",
};
const config: AuthConfig = {
  captchaEnabled: true,
  callback: (_request, flow, state) =>
    "https://test.salamsourcing.com/auth/callback?flow=" +
    flow +
    "&state=" +
    state,
};
function fixture(
  options: {
    factors?: (typeof verified)[];
    aal?: string;
    session?: boolean;
    revoked?: boolean;
    deletion?: string;
    cookie?: string;
    company?: string;
  } = {},
) {
  const calls: Call[] = [];
  const cookies = new Map<string, { value: string }>();
  const writes: Call[] = [];
  const record = (name: string, args?: unknown) => {
    calls.push({ name, args });
    return { data: {}, error: null };
  };
  const factors = options.factors ?? [];
  const raw = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "fixture-user", is_anonymous: false } },
        error: null,
      }),
      signOut: async (args: unknown) => {
        record("logout", args);
        return { error: options.revoked ? { code: "offline" } : null };
      },
      signInWithPassword: async (args: unknown) => record("login", args),
      signUp: async (args: unknown) => {
        record("signup", args);
        return { data: { session: options.session ? {} : null }, error: null };
      },
      resetPasswordForEmail: async (...args: unknown[]) =>
        record("reset", args),
      updateUser: async (args: unknown) => record("password", args),
      reauthenticate: async () => record("reauthenticate"),
      mfa: {
        listFactors: async () => ({
          data: {
            all: factors,
            totp: factors.filter((f) => f.status === "verified"),
            phone: [],
          },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: options.aal ?? "aal1", nextLevel: "aal2" },
          error: null,
        }),
        challengeAndVerify: async (args: unknown) => record("verify", args),
        enroll: async (args: unknown) => {
          record("enroll", args);
          return {
            data: {
              id: "new-factor",
              totp: { secret: "fixture-only", qr_code: "<svg/>" },
            },
            error: null,
          };
        },
        unenroll: async (args: unknown) => record("unenroll", args),
      },
    },
    from: (name: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data:
              name === "profiles"
                ? {
                    id: "fixture-user",
                    first_name: "Fixture",
                    last_name: "User",
                    email: "fixture@example.invalid",
                    status: "active",
                  }
                : options.deletion
                  ? { status: options.deletion }
                  : null,
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (name: string, args?: unknown) => {
      record(name, args);
      if (name === "get_my_companies")
        return {
          data: [
            {
              id: 10,
              display_name: "Default",
              role: "owner",
              verification_status: "verified",
              city: null,
              province_state: null,
              country: null,
            },
            {
              id: 20,
              display_name: "Selected",
              role: "buyer",
              verification_status: "unverified",
              city: null,
              province_state: null,
              country: null,
            },
          ],
          error: null,
        };
      if (name === "get_company_permissions")
        return { data: ["procurement"], error: null };
      return { data: {}, error: null };
    },
  };
  const client = raw as unknown as Client;
  const context = {
    request: new Request("https://test.salamsourcing.com/api/auth/action", {
      headers: { cookie: options.cookie ?? "" },
    }),
    url: new URL("https://test.salamsourcing.com/api/auth/action"),
    locals: { supabase: client, authHeaders: new Headers() },
    params: { action: "" },
    cookies: {
      get: (name: string) =>
        name === "ss-company-fixture-user" && options.company
          ? { value: options.company }
          : cookies.get(name),
      set: (name: string, value: string, opts: unknown) => {
        cookies.set(name, { value });
        writes.push({ name, args: opts });
      },
      delete: (name: string, opts: unknown) => {
        cookies.delete(name);
        writes.push({ name, args: opts });
      },
    },
  } as unknown as APIContext;
  const action = (name: string, input: Record<string, unknown> = {}) =>
    handleAuthAction(context, input, name, config);
  const mutation = async (name: string, input: Record<string, unknown>) => {
    context.params.action = name;
    context.request = new Request(
      "https://test.salamsourcing.com/api/safety/" + name,
      {
        method: "POST",
        headers: {
          Origin: "https://test.salamsourcing.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    return safety(context);
  };
  return { context, client, calls, writes, cookies, action, mutation };
}
const credentials = {
  email: "fixture@example.invalid",
  password: " fixture-password ",
  captcha_token: "fixture-token",
};
const rejected = (code: string) => (error: unknown) =>
  error instanceof AccessError && error.code === code;

test("login rejects absent CAPTCHA before Auth and preserves password bytes", async () => {
  const f = fixture();
  await assert.rejects(
    f.action("login", { ...credentials, captcha_token: "" }),
    rejected("invalid_input"),
  );
  assert.equal(f.calls.length, 0);
  await f.action("login", credentials);
  assert.equal(
    f.calls.find((c) => c.name === "login")?.args.password,
    credentials.password,
  );
});
test("signup sends identity only, binds confirmation to this browser and provisions only a signed-in profile", async () => {
  const f = fixture();
  const response = await f.action("signup", {
    ...credentials,
    first_name: " First ",
    last_name: " Last ",
    intent: "sell",
    role: "admin",
    permissions: ["billing"],
  });
  assert.deepEqual(await response.json(), { redirect: "/verify-email" });
  const sent = f.calls.find((c) => c.name === "signup")!.args;
  assert.deepEqual(sent.options.data, {
    first_name: "First",
    last_name: "Last",
  });
  const flow = JSON.parse(f.cookies.get("ss-auth-flow")!.value);
  assert.equal(
    new URL(sent.options.emailRedirectTo).searchParams.get("state"),
    flow.state,
  );
  assert.equal(flow.flow, "signup");
  assert.equal(
    f.calls.some((c) => c.name === "ensure_current_profile"),
    false,
  );
  assert.equal(f.cookies.get("ss-intent")?.value, "sell");
  const options = f.writes.find((c) => c.name === "ss-auth-flow")!.args;
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  const signedIn = fixture({ session: true });
  await signedIn.action("signup", {
    ...credentials,
    first_name: "First",
    last_name: "Last",
    intent: "both",
  });
  assert.deepEqual(
    signedIn.calls.find((c) => c.name === "ensure_current_profile")?.args,
    { p_first_name: "First", p_last_name: "Last" },
  );
});
test("recovery uses a state-bound HTTPS callback and a generic response", async () => {
  const f = fixture();
  const body = (await (await f.action("reset", credentials)).json()) as {
    message: string;
  };
  assert.match(body.message, /If an account matches/);
  const [, opts] = f.calls.find((c) => c.name === "reset")!.args;
  const flow = JSON.parse(f.cookies.get("ss-auth-flow")!.value);
  assert.equal(flow.flow, "recovery");
  assert.equal(new URL(opts.redirectTo).searchParams.get("state"), flow.state);
  assert.equal(opts.captchaToken, "fixture-token");
});
test("password recovery cannot bypass an enrolled second factor", async () => {
  const f = fixture({ factors: [verified], aal: "aal1" });
  await assert.rejects(
    f.action("password", {
      password: "new-password",
      confirm_password: "new-password",
    }),
    rejected("mfa_required"),
  );
  assert.equal(
    f.calls.some((c) => c.name === "password"),
    false,
  );
  await assert.rejects(f.action("reauthenticate"), rejected("mfa_required"));
});
test("password confirmation and reauthentication nonce are enforced", async () => {
  const f = fixture({ factors: [verified], aal: "aal2" });
  await assert.rejects(
    f.action("password", {
      password: "new-password",
      confirm_password: "different",
    }),
    rejected("password_mismatch"),
  );
  await f.action("password", {
    password: "new-password",
    confirm_password: "new-password",
    nonce: "123456",
  });
  assert.deepEqual(f.calls.find((c) => c.name === "password")?.args, {
    password: "new-password",
    nonce: "123456",
  });
});
test("MFA verification accepts only this user's appropriate factor and six digits", async () => {
  const f = fixture({ factors: [verified, abandoned] });
  for (const factor of ["someone-elses", "unverified-own"]) {
    await assert.rejects(
      f.action("mfa-verify", { factor_id: factor, code: "123456" }),
      rejected("factor_unavailable"),
    );
  }
  await assert.rejects(
    f.action("mfa-verify", { factor_id: verified.id, code: "abcdef" }),
    rejected("invalid_code"),
  );
  assert.equal(
    f.calls.some((c) => c.name === "verify"),
    false,
  );
  const response = await f.action("mfa-verify", {
    factor_id: verified.id,
    code: "123456",
    next: "https://other.invalid",
  });
  assert.deepEqual(await response.json(), {
    redirect: "/account/security",
  });
  assert.deepEqual(f.calls.find((c) => c.name === "verify")?.args, {
    factorId: verified.id,
    code: "123456",
  });
});
test("enrollment cleans up only abandoned factors and never replaces a verified factor", async () => {
  const f = fixture({ factors: [abandoned] });
  await f.action("mfa-enroll");
  assert.deepEqual(
    f.calls
      .filter((c) => ["unenroll", "enroll"].includes(c.name))
      .map((c) => c.name),
    ["unenroll", "enroll"],
  );
  assert.deepEqual(f.calls.find((c) => c.name === "unenroll")?.args, {
    factorId: abandoned.id,
  });
  const enabled = fixture({ factors: [verified, abandoned], aal: "aal2" });
  await assert.rejects(
    enabled.action("mfa-enroll"),
    rejected("already_enrolled"),
  );
  assert.equal(
    enabled.calls.some((c) => c.name === "unenroll" || c.name === "enroll"),
    false,
  );
});
test("MFA cancellation cannot remove verified factors and removal requires confirmation plus aal2", async () => {
  const f = fixture({ factors: [verified, abandoned], aal: "aal2" });
  await assert.rejects(
    f.action("mfa-cancel", { factor_id: verified.id }),
    rejected("factor_unavailable"),
  );
  await assert.rejects(
    f.action("mfa-remove", { factor_id: verified.id, confirm: "" }),
    rejected("confirmation_required"),
  );
  await f.action("mfa-cancel", { factor_id: abandoned.id });
  await f.action("mfa-remove", { factor_id: verified.id, confirm: "REMOVE" });
  assert.deepEqual(
    f.calls.filter((c) => c.name === "unenroll").map((c) => c.args.factorId),
    [abandoned.id, verified.id],
  );
});
test("logout clears local cookies even when remote revocation fails or configuration is unavailable", async () => {
  for (const unavailable of [false, true]) {
    const f = fixture({
      revoked: true,
      cookie:
        "ss-auth.0=fixture; ss-auth.1=fixture; ss-company-fixture-user=10; unrelated=keep",
    });
    if (unavailable) f.context.locals.supabase = null;
    const body = await (await f.action("logout")).json();
    assert.deepEqual(body, {
      redirect: "/login?notice=logout-pending",
      signedOut: true,
      remoteRevoked: false,
    });
    assert.equal(
      f.writes.some((c) => c.name === "ss-auth.0"),
      true,
    );
    assert.equal(
      f.writes.some((c) => c.name === "ss-company-fixture-user"),
      true,
    );
    assert.equal(
      f.writes.some((c) => c.name === "unrelated"),
      false,
    );
    assert.equal(
      f.writes.every(
        (c) => c.args.httpOnly && c.args.secure && c.args.path === "/",
      ),
      true,
    );
  }
});
test("cookie cleanup also removes pending callback and intent state", () => {
  const f = fixture({ cookie: "ss-auth-flow=fixture; ss-intent=buy" });
  clearLocalSession(f.context);
  assert.equal(
    f.writes.some((c) => c.name === "ss-auth-flow"),
    true,
  );
  assert.equal(
    f.writes.some((c) => c.name === "ss-intent"),
    true,
  );
});
test("safety blocking refuses selected-company drift before any mutation", async () => {
  const f = fixture({ company: "20" });
  const response = await f.mutation("block", {
    company_id: 20,
    target_id: 30,
    confirm: "CONFIRM",
  });
  assert.equal(response.status, 409);
  assert.equal(
    f.calls.some((c) => c.name === "block_company"),
    false,
  );
  const allowed = fixture({ company: "10" });
  assert.equal(
    (
      await allowed.mutation("block", {
        company_id: 10,
        target_id: 30,
        confirm: "CONFIRM",
      })
    ).status,
    200,
  );
  assert.deepEqual(
    allowed.calls.find((c) => c.name === "block_company")?.args,
    { p_company_id: 30 },
  );
});
test("deletion requires DELETE and cancellation checks the actual pending status", async () => {
  const f = fixture();
  assert.equal((await f.mutation("delete", { confirm: "delete" })).status, 400);
  assert.equal(
    f.calls.some((c) => c.name === "request_account_deletion"),
    false,
  );
  assert.equal((await f.mutation("delete", { confirm: "DELETE" })).status, 200);
  for (const status of ["processing", "failed", "completed"]) {
    const locked = fixture({ deletion: status });
    assert.equal((await locked.mutation("cancel-deletion", {})).status, 409);
    assert.equal(
      locked.calls.some((c) => c.name === "cancel_account_deletion"),
      false,
    );
  }
  const pending = fixture({ deletion: "pending" });
  assert.equal((await pending.mutation("cancel-deletion", {})).status, 200);
});
test("reports map exactly one allowed target to guarded RPCs", async () => {
  for (const type of ["company", "listing", "message"]) {
    const f = fixture();
    assert.equal(
      (
        await f.mutation("report", {
          target_type: type,
          target_id: 30,
          reason: "other",
          description: "Fixture report only",
        })
      ).status,
      200,
    );
    const sent = f.calls.find((c) => c.name === "file_complaint")!.args;
    assert.deepEqual(
      Object.entries(sent).filter(
        ([key, value]) => key.startsWith("p_target_") && value !== undefined,
      ),
      [["p_target_" + type + "_id", 30]],
    );
  }
  const review = fixture();
  assert.equal(
    (
      await review.mutation("report", {
        target_type: "review",
        target_id: 30,
        reason: "other",
        description: "Fixture report only",
      })
    ).status,
    200,
  );
  assert.equal(
    review.calls.some((c) => c.name === "report_company_review"),
    true,
  );
  const invalid = fixture();
  assert.equal(
    (
      await invalid.mutation("report", {
        target_type: "company",
        target_id: 30,
        reason: "not-valid",
        description: "Fixture",
      })
    ).status,
    400,
  );
  assert.equal(
    invalid.calls.some((c) => c.name === "file_complaint"),
    false,
  );
});

test("login forwards existing long passwords unchanged while signup rejects new over-limit passwords", async () => {
  const f = fixture();
  const password = " x".repeat(65);
  await f.action("login", {
    email: "fixture@example.com",
    password,
    captcha_token: "fixture-token",
  });
  assert.equal(
    f.calls.find((c) => c.name === "login")?.args.password,
    password,
  );
  await assert.rejects(
    () =>
      f.action("signup", {
        email: "fixture@example.com",
        password,
        first_name: "First",
        last_name: "Last",
        captcha_token: "fixture-token",
      }),
    AccessError,
  );
  assert.equal(f.calls.filter((c) => c.name === "signup").length, 0);
});
