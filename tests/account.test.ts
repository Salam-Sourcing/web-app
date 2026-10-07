import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import { handleAccountAction } from "../src/lib/server/account-actions.ts";
import {
  personalExport,
  exportSections,
  permissionOverride,
  uuid,
  ratio,
} from "../src/lib/account.ts";
import { AccessError, verifiedCallbackFlow } from "../src/lib/security.ts";
import type { Workspace } from "../src/lib/server/access.ts";
const member = "00000000-0000-4000-8000-000000000010",
  invitation = "00000000-0000-4000-8000-000000000020";
function fixture(
  role = "owner",
  permissions = ["team", "billing"],
  rpcError: string | null = null,
) {
  const calls: { name: string; args: any }[] = [],
    cookies = new Map<string, string>();
  const record = (name: string, args: any) => {
    calls.push({ name, args });
    return { error: null, data: [] };
  };
  const client = {
    rpc: async (name: string, args: any) => {
      calls.push({ name, args });
      return {
        error: rpcError ? { code: rpcError, message: "Denied" } : null,
        data:
          name === "get_company_team"
            ? { invitations: [{ id: invitation }] }
            : name === "accept_company_invitation"
              ? 4
              : 99,
      };
    },
    from: (table: string) => {
      const q: any = {
        then: (fn: any) => Promise.resolve(record(table, null)).then(fn),
      };
      for (const method of [
        "eq",
        "delete",
        "update",
        "upsert",
        "select",
        "order",
        "limit",
        "single",
      ])
        q[method] = (...args: any[]) => {
          calls.push({ name: table + "." + method, args });
          return q;
        };
      return q;
    },
  };
  const company = {
    id: 4,
    role,
    display_name: "Fixture",
    verification_status: "verified",
  };
  const state = {
    client,
    user: { id: member, email: "owner@example.invalid" },
    company,
    companies: [company],
    permissions,
    profile: { id: member, status: "active" },
  } as unknown as Workspace;
  const context = {
    locals: { workspace: state },
    url: new URL("https://test.salamsourcing.com"),
    request: new Request("https://test.salamsourcing.com/api/account"),
    cookies: { set: (name: string, value: string) => cookies.set(name, value) },
  } as unknown as APIContext;
  return { context, calls, cookies };
}
test("display currency writes only the signed-in user's preference", async () => {
  for (const choice of ["USD", "PKR", ""]) {
    const f = fixture();
    const response = await handleAccountAction(
      f.context,
      { currency: choice, user_id: invitation },
      "currency",
    );
    assert.deepEqual(await response.json(), { redirect: "/account/currency" });
    assert.deepEqual(
      f.calls.find((c) => c.name === "listing_currency_preferences.upsert")
        ?.args,
      [{ user_id: member, currency: choice || null }],
    );
    assert.ok(
      f.calls.every((c) => c.name.startsWith("listing_currency_preferences")),
    );
  }
});
test("invalid display currencies are rejected before any write", async () => {
  for (const choice of [undefined, "usd", "XXX", 42]) {
    const f = fixture();
    await assert.rejects(
      () => handleAccountAction(f.context, { currency: choice }, "currency"),
      (error: any) => error instanceof AccessError && error.status === 400,
    );
    assert.equal(f.calls.length, 0);
  }
});
test("team actions deny an effective scope override even to an owner", async () => {
  const f = fixture("owner", []);
  await assert.rejects(
    () =>
      handleAccountAction(
        f.context,
        { company_id: "4", email: "member@example.invalid", role: "member" },
        "invite",
      ),
    (e: any) => e instanceof AccessError && e.status === 403,
  );
  assert.equal(f.calls.length, 0);
});
test("ordinary managers cannot administer teams despite a supplied team scope", async () => {
  const f = fixture("manager");
  await assert.rejects(() =>
    handleAccountAction(
      f.context,
      { company_id: "4", email: "member@example.invalid", role: "member" },
      "invite",
    ),
  );
  assert.equal(f.calls.length, 0);
});
test("administrators cannot appoint administrators", async () => {
  const f = fixture("admin");
  await assert.rejects(() =>
    handleAccountAction(
      f.context,
      { company_id: "4", email: "member@example.invalid", role: "admin" },
      "invite",
    ),
  );
  assert.equal(f.calls.length, 0);
});
test("team invitation normalizes email and uses current company ID", async () => {
  const f = fixture();
  await handleAccountAction(
    f.context,
    { company_id: "4", email: " MEMBER@Example.invalid ", role: "procurement" },
    "invite",
  );
  assert.deepEqual(f.calls[0], {
    name: "invite_company_member",
    args: {
      p_company_id: 4,
      p_email: "member@example.invalid",
      p_role: "procurement",
    },
  });
});
test("company mismatch blocks stale team form before mutation", async () => {
  const f = fixture();
  await assert.rejects(() =>
    handleAccountAction(
      f.context,
      { company_id: "5", email: "a@example.invalid", role: "member" },
      "invite",
    ),
  );
  assert.equal(f.calls.length, 0);
});
test("owner override distinguishes role defaults, no scopes, and restricted scopes", async () => {
  assert.equal(permissionOverride({ mode: "role", billing: "on" }), null);
  assert.deepEqual(permissionOverride({ mode: "custom" }), []);
  assert.deepEqual(
    permissionOverride({
      mode: "custom",
      sales: "on",
      billing: "on",
      arbitrary: "on",
    }),
    ["sales", "billing"],
  );
  const f = fixture();
  await handleAccountAction(
    f.context,
    { company_id: "4", user_id: invitation, mode: "role" },
    "permissions",
  );
  assert.equal(f.calls[0].args.p_permissions, null);
});
test("administrator cannot set owner restrictions", async () => {
  const f = fixture("admin");
  await assert.rejects(() =>
    handleAccountAction(
      f.context,
      { company_id: "4", user_id: invitation, mode: "custom" },
      "permissions",
    ),
  );
  assert.equal(f.calls.length, 0);
});
test("invitation rejection never calls acceptance or sets company cookie", async () => {
  const f = fixture("owner", ["team"], "42501");
  await assert.rejects(() =>
    handleAccountAction(
      f.context,
      { invitation_id: invitation, confirm: "ACCEPT" },
      "accept-invitation",
    ),
  );
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].name, "get_company_invitation");
  assert.equal(f.cookies.size, 0);
});
test("accepted invitation selects only the RPC returned authorized company", async () => {
  const f = fixture();
  await handleAccountAction(
    f.context,
    { invitation_id: invitation, confirm: "ACCEPT", company_id: "999" },
    "accept-invitation",
  );
  assert.equal(f.cookies.get("ss-company-" + member), "4");
  assert.deepEqual(
    f.calls.map((c) => c.name),
    [
      "get_company_invitation",
      "accept_company_invitation",
      "get_company_permissions",
    ],
  );
});
test("billing changes need permission and explicit confirmation", async () => {
  for (const f of [fixture("owner", []), fixture()])
    await assert.rejects(() =>
      handleAccountAction(
        f.context,
        { company_id: "4", request_type: "cancel" },
        "billing",
      ),
    );
  const f = fixture();
  await handleAccountAction(
    f.context,
    {
      company_id: "4",
      request_type: "cancel",
      confirm: "REQUEST",
      plan_id: "999",
    },
    "billing",
  );
  assert.deepEqual(f.calls[0].args, {
    p_company_id: 4,
    p_request_type: "cancel",
  });
});
test("notification deletion is bound to the signed-in user", async () => {
  const f = fixture();
  await handleAccountAction(
    f.context,
    { id: "17", user_id: invitation },
    "notification-delete",
  );
  assert.deepEqual(f.calls.find((c) => c.name === "notifications.eq")?.args, [
    "user_id",
    member,
  ]);
});
test("preference writes whitelist six flags and current user", async () => {
  const f = fixture();
  await handleAccountAction(
    f.context,
    { messages: "on", user_id: invitation, admin: "on" },
    "preferences",
  );
  const row = f.calls.find((c) => c.name.endsWith(".upsert"))!.args[0];
  assert.equal(row.user_id, member);
  assert.equal(row.messages, true);
  assert.equal(row.search_alerts, false);
  assert.equal(row.admin, undefined);
});
test("support replies carry immutable request version and handle concurrent edits", async () => {
  const f = fixture("owner", ["team"], "40001");
  await assert.rejects(
    () =>
      handleAccountAction(
        f.context,
        { id: invitation, version: "7", reply: "My response" },
        "support-reply",
      ),
    (e: any) => e.status === 409,
  );
  assert.deepEqual(f.calls[0].args, {
    p_action: "reply",
    p_data: { reply: "My response" },
    p_id: invitation,
    p_version: 7,
  });
});
test("saved searches default alerts off and do not accept an arbitrary owner", async () => {
  const f = fixture();
  await handleAccountAction(
    f.context,
    {
      name: "Coils",
      kind: "listing",
      frequency: "daily",
      filters: '{"query":"coils"}',
      user_id: invitation,
    },
    "search-save",
  );
  assert.deepEqual(f.calls[0].args, {
    p_name: "Coils",
    p_kind: "listing",
    p_filters: { query: "coils" },
    p_alerts: false,
    p_frequency: "daily",
  });
});
test("email callback flow is bound and expired states fail", () => {
  const raw = JSON.stringify({
    flow: "email_change",
    state: "nonce",
    expires: 2000,
  });
  assert.equal(verifiedCallbackFlow(raw, "nonce", 1000), "email_change");
  assert.equal(verifiedCallbackFlow(raw, "other", 1000), null);
  assert.equal(verifiedCallbackFlow(raw, "nonce", 2000), null);
});
function page(index: number, length = 0) {
  return {
    subject: member,
    page: index,
    page_size: 100,
    profile: { id: member },
    ...Object.fromEntries(
      exportSections.map((s) => [
        s,
        Array.from({ length }, (_, i) => ({ id: index * 100 + i })),
      ]),
    ),
  };
}
test("personal export combines every section across pages without truncating", async () => {
  const requested: number[] = [];
  const output = await personalExport(async (i) => {
    requested.push(i);
    return page(i, i === 0 ? 100 : 3);
  }, member);
  assert.deepEqual(requested, [0, 1]);
  for (const key of exportSections) assert.equal(output[key].length, 103);
});
test("personal export rejects foreign subjects, malformed sections and oversized exports", async () => {
  await assert.rejects(() =>
    personalExport(async () => ({ ...page(0), subject: invitation }), member),
  );
  await assert.rejects(() =>
    personalExport(
      async () => ({ ...page(0), filed_complaints: null }),
      member,
    ),
  );
  await assert.rejects(() =>
    personalExport(async (i) => page(i, 100), member, 2),
  );
  await assert.rejects(() =>
    personalExport(async (i) => page(i, 1), member, 100, 1),
  );
});
test("supplier ratios preserve unavailable denominators and zero numerators", () => {
  assert.equal(ratio(0, 0), "Unavailable");
  assert.equal(ratio(0, 10), "0.0%");
  assert.equal(ratio(1, 4), "25.0%");
  assert.throws(() => uuid("https://attacker.invalid"));
});
