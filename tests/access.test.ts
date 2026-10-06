import { test } from "node:test";
import assert from "node:assert/strict";
import {
  workspace,
  identity,
  fingerprint,
  type Client,
} from "../src/lib/server/access.ts";
import { AccessError } from "../src/lib/security.ts";

type Options = {
  user?: boolean;
  anonymous?: boolean;
  userError?: { status: number };
  factor?: boolean;
  aal?: string;
  phone?: boolean;
  profile?: string | null;
  profileError?: boolean;
  permissionError?: boolean;
  permissions?: string[];
};
function fake(options: Options = {}) {
  const calls: string[] = [];
  const verified = {
    id: "factor-1",
    factor_type: "totp",
    status: "verified",
    friendly_name: "Authenticator",
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user:
            options.user === false
              ? null
              : {
                  id: "user-1",
                  email: "one@example.test",
                  is_anonymous: options.anonymous ?? false,
                },
        },
        error: options.userError ?? null,
      }),
      mfa: {
        listFactors: async () => ({
          data: {
            totp: options.factor ? [verified] : [],
            phone: options.phone ? [{ id: "phone-1" }] : [],
            all: options.factor ? [verified] : [],
          },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: {
            currentLevel: options.aal ?? "aal1",
            nextLevel: options.factor ? "aal2" : "aal1",
          },
          error: null,
        }),
      },
    },
    from: (name: string) => {
      calls.push(name);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                options.profile === null
                  ? null
                  : {
                      id: "user-1",
                      email: "one@example.test",
                      first_name: "One",
                      last_name: "User",
                      status: options.profile ?? "active",
                    },
              error: options.profileError ? { code: "network" } : null,
            }),
          }),
        }),
      };
    },
    rpc: async (name: string, args?: { p_company_id?: number }) => {
      calls.push(name);
      if (name === "get_my_companies")
        return {
          data: [
            {
              id: 10,
              display_name: "First",
              role: "owner",
              verification_status: "verified",
              city: null,
              province_state: null,
              country: null,
            },
            {
              id: 20,
              display_name: "Second",
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
        return {
          data:
            options.permissions ??
            (args?.p_company_id === 20
              ? ["procurement"]
              : ["listings", "sales"]),
          error: options.permissionError ? { code: "network" } : null,
        };
      throw new Error("Unexpected RPC");
    },
  };
  return { client: client as unknown as Client, calls };
}
test("anonymous and missing users never reach private data", async () => {
  for (const options of [{ user: false }, { anonymous: true }]) {
    const { client, calls } = fake(options);
    await assert.rejects(
      workspace(client),
      (error: AccessError) => error.status === 401,
    );
    assert.deepEqual(calls, []);
  }
});
test("fresh MFA enrollment requires aal2 before profile/company reads", async () => {
  const { client, calls } = fake({ factor: true, aal: "aal1" });
  await assert.rejects(
    workspace(client),
    (error: AccessError) => error.code === "mfa_required",
  );
  assert.deepEqual(calls, []);
});
test("MFA-compliant session reads the guarded profile and backend permissions", async () => {
  const { client, calls } = fake({ factor: true, aal: "aal2" });
  const state = await workspace(client, "20");
  assert.equal(state.company?.id, 20);
  assert.deepEqual(state.permissions, ["procurement"]);
  assert.deepEqual(calls, [
    "profiles",
    "get_my_companies",
    "get_company_permissions",
  ]);
});
test("unsupported phone factor fails closed", async () => {
  const { client, calls } = fake({ phone: true });
  await assert.rejects(
    identity(client),
    (error: AccessError) => error.code === "unsupported_factor",
  );
  assert.deepEqual(calls, []);
});
test("missing guarded profile after revocation and inactive accounts are denied", async () => {
  for (const profile of [null, "suspended", "deleted"]) {
    const { client, calls } = fake({ profile });
    await assert.rejects(
      workspace(client),
      (error: AccessError) => error.code === "account_unavailable",
    );
    assert.deepEqual(calls, ["profiles"]);
  }
});
test("verification outages never become empty authorized data", async () => {
  const { client } = fake({ profileError: true });
  await assert.rejects(
    workspace(client),
    (error: AccessError) => error.status === 503,
  );
  const broken = fake({ permissionError: true });
  await assert.rejects(
    workspace(broken.client),
    (error: AccessError) => error.status === 503,
  );
});
test("invalid saved company falls back only to an authorized company", async () => {
  const { client } = fake();
  const state = await workspace(client, "999");
  assert.equal(state.company?.id, 10);
  assert.equal(state.safetyCompany?.id, 10);
});
test("fingerprints change for permission, company and MFA-factor changes", async () => {
  const first = await workspace(fake().client, "10");
  const second = await workspace(fake({ permissions: [] }).client, "10");
  const third = await workspace(fake().client, "20");
  const fourth = await workspace(
    fake({ factor: true, aal: "aal2" }).client,
    "10",
  );
  assert.notEqual(fingerprint(first), fingerprint(second));
  assert.notEqual(fingerprint(first), fingerprint(third));
  assert.notEqual(fingerprint(first), fingerprint(fourth));
});
