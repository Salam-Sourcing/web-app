import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import { notificationTarget } from "../src/lib/server/notification-target.ts";
import { AccessError } from "../src/lib/security.ts";

function fixture(
  notification: any,
  rpcError = false,
  options: {
    verification?: any;
    companies?: any[];
    role?: string;
    quote?: any;
    enquiry?: any;
    permissions?: string[];
  } = {},
) {
  const companies = options.companies ?? [
    { id: 4, role: options.role ?? "owner" },
  ];
  const calls: any[] = [],
    cookies: any[] = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "current-user", is_anonymous: false } },
        error: null,
      }),
      mfa: {
        listFactors: async () => ({
          data: { all: [], totp: [], phone: [] },
          error: null,
        }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal1" },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      calls.push(["from", table]);
      const query: any = {
        select: (columns: string) => {
          calls.push(["select", columns]);
          return query;
        },
        eq: (column: string, value: unknown) => {
          calls.push(["eq", column, value]);
          return query;
        },
        maybeSingle: async () => ({
          data:
            table === "notifications"
              ? notification
              : table === "quotes"
                ? (options.quote ?? null)
                : table === "enquiries"
                  ? (options.enquiry ?? null)
                  : table === "company_verifications"
                    ? (options.verification ?? null)
                    : { id: "current-user", status: "active" },
          error: null,
        }),
      };
      return query;
    },
    rpc: async (name: string, args: unknown) => {
      calls.push(["rpc", name, args]);
      return {
        data:
          name === "get_my_companies"
            ? companies
            : name === "get_company_permissions"
              ? (options.permissions ?? [])
              : [],
        error: rpcError
          ? { code: "P0001", message: "Search unavailable" }
          : null,
      };
    },
  };
  const state = {
    client,
    user: { id: "current-user" },
    company: companies[0],
    companies,
    permissions: options.permissions ?? [],
  } as unknown as Workspace;
  const context = {
    url: new URL("https://test.salamsourcing.com"),
    cookies: { set: (...args: any[]) => cookies.push(args) },
  } as unknown as APIContext;
  return { state, context, calls, cookies };
}

test("notification lookup binds both the supplied id and current recipient", async () => {
  const f = fixture(null);
  await assert.rejects(
    () => notificationTarget(f.context, f.state, 73),
    (e: any) => e instanceof AccessError && e.status === 404,
  );
  assert.ok(f.calls.some((c) => c[0] === "eq" && c[1] === "id" && c[2] === 73));
  assert.ok(
    f.calls.some(
      (c) => c[0] === "eq" && c[1] === "user_id" && c[2] === "current-user",
    ),
  );
  assert.equal(f.cookies.length, 0);
});

test("revoked recipient-company membership fails before company selection", async () => {
  const f = fixture({
    recipient_company_id: 99,
    entity_type: "deal",
    entity_id: 8,
  });
  await assert.rejects(
    () => notificationTarget(f.context, f.state, 73),
    (e: any) => e instanceof AccessError && e.status === 403,
  );
  assert.equal(f.cookies.length, 0);
  assert.ok(!f.calls.some((c) => c[0] === "rpc"));
});

test("saved-search notification resolves its owned record and ignores untrusted links", async () => {
  const f = fixture({
    entity_type: "saved_search",
    entity_id: 12,
    link_url: "https://evil.invalid",
    data: { redirect: "/deals/99" },
  });
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/account/searches/12",
    companyChanged: false,
  });
  assert.ok(
    f.calls.some(
      (c) =>
        c[0] === "rpc" &&
        c[1] === "get_saved_search_matches" &&
        c[2].p_search_id === 12,
    ),
  );
  assert.equal(f.cookies.length, 0);
});

test("deleted saved-search notifications cannot reopen a stale destination", async () => {
  const f = fixture({ entity_type: "saved_search", entity_id: 12 }, true);
  await assert.rejects(() => notificationTarget(f.context, f.state, 73));
  assert.equal(f.cookies.length, 0);
});

test("support notice without entity fields opens only the fixed support destination", async () => {
  const f = fixture({
    entity_type: null,
    entity_id: null,
    data: {
      case_id: "11111111-1111-4111-8111-111111111111",
      redirect: "https://evil.invalid",
    },
  });
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/account/support",
    companyChanged: false,
  });
  assert.ok(f.calls.some((c) => c[0] === "select" && c[1].includes("data")));
});
test("invalid support metadata cannot create a navigation destination", async () => {
  for (const case_id of ["", "../account/security", {}, null]) {
    const f = fixture({
      data: { case_id },
      entity_type: null,
      entity_id: null,
    });
    assert.equal(
      (await notificationTarget(f.context, f.state, 73)).redirect,
      "/account/notifications",
    );
  }
});
test("verification notice resolves its authorized company and selects it", async () => {
  const f = fixture(
    {
      entity_type: "company_verification",
      entity_id: 9,
      recipient_company_id: 8,
    },
    false,
    {
      verification: { company_id: 8 },
      companies: [
        { id: 4, role: "owner" },
        { id: 8, role: "admin" },
      ],
    },
  );
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/company",
    companyChanged: true,
  });
  assert.equal(f.cookies.length, 1);
  assert.equal(f.cookies[0][1], "8");
  assert.ok(
    f.calls.some((c) => c[0] === "from" && c[1] === "company_verifications"),
  );
});
test("legacy verification notice without recipient company uses the owned verification record", async () => {
  const f = fixture(
    { entity_type: "company_verification", entity_id: 9 },
    false,
    {
      verification: { company_id: 8 },
      companies: [
        { id: 4, role: "owner" },
        { id: 8, role: "owner" },
      ],
    },
  );
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/company",
    companyChanged: true,
  });
});
test("missing, unrelated and mismatched verification targets never update company selection", async () => {
  for (const verification of [null, { company_id: 99 }]) {
    const f = fixture(
      { entity_type: "company_verification", entity_id: 9 },
      false,
      { verification },
    );
    await assert.rejects(() => notificationTarget(f.context, f.state, 73));
    assert.equal(f.cookies.length, 0);
  }
  const f = fixture(
    {
      entity_type: "company_verification",
      entity_id: 9,
      recipient_company_id: 4,
    },
    false,
    {
      verification: { company_id: 8 },
      companies: [
        { id: 4, role: "owner" },
        { id: 8, role: "owner" },
      ],
    },
  );
  await assert.rejects(() => notificationTarget(f.context, f.state, 73));
  assert.equal(f.cookies.length, 0);
});
test("verification notification cannot bypass company-manager access", async () => {
  const f = fixture(
    { entity_type: "company_verification", entity_id: 9 },
    false,
    { verification: { company_id: 4 }, role: "member" },
  );
  await assert.rejects(
    () => notificationTarget(f.context, f.state, 73),
    (e: any) => e instanceof AccessError && e.status === 403,
  );
  assert.equal(f.cookies.length, 0);
});

for (const party of ["buyer", "supplier"] as const) {
  test(`quote notification resolves quote 901 to enquiry 42 for ${party}`, async () => {
    const f = fixture({ entity_type: "quote", entity_id: 901 }, false, {
      quote: { enquiry_id: 42, supplier_company_id: 8 },
      enquiry: { id: 42, buyer_company_id: party === "buyer" ? 4 : 9 },
      companies: [{ id: party === "buyer" ? 4 : 8, role: "owner" }],
      permissions: [party === "buyer" ? "procurement" : "sales"],
    });
    assert.equal(
      (await notificationTarget(f.context, f.state, 73)).redirect,
      "/quotes/901",
    );
    assert.ok(f.calls.some((c) => c[0] === "from" && c[1] === "quotes"));
    assert.ok(
      f.calls.some((c) => c[0] === "eq" && c[1] === "id" && c[2] === 42),
    );
    assert.ok(!f.calls.some((c) => c[0] === "from" && c[1] === "quote_items"));
  });
}
test("quote notice never opens deleted, unrelated or forbidden targets", async () => {
  for (const options of [
    {
      quote: null,
      enquiry: { id: 42, buyer_company_id: 4 },
      permissions: ["procurement"],
    },
    {
      quote: { enquiry_id: 42, supplier_company_id: 8 },
      enquiry: null,
      permissions: ["procurement"],
    },
    {
      quote: { enquiry_id: 42, supplier_company_id: 8 },
      enquiry: { id: 42, buyer_company_id: 9 },
      permissions: ["procurement"],
    },
    {
      quote: { enquiry_id: 42, supplier_company_id: 8 },
      enquiry: { id: 42, buyer_company_id: 4 },
      permissions: [],
    },
  ]) {
    const f = fixture({ entity_type: "quote", entity_id: 901 }, false, options);
    await assert.rejects(() => notificationTarget(f.context, f.state, 73));
    assert.equal(f.cookies.length, 0);
  }
});
test("quote notice selects its participating recipient company only after resolving access", async () => {
  const options = {
    companies: [
      { id: 4, role: "owner" },
      { id: 8, role: "sales" },
    ],
    quote: { enquiry_id: 42, supplier_company_id: 8 },
    enquiry: { id: 42, buyer_company_id: 4 },
    permissions: ["sales"],
  };
  const f = fixture(
    { entity_type: "quote", entity_id: 901, recipient_company_id: 8 },
    false,
    options,
  );
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/quotes/901",
    companyChanged: true,
  });
  assert.equal(f.cookies[0][1], "8");
  const denied = fixture(
    { entity_type: "quote", entity_id: 901, recipient_company_id: 8 },
    false,
    { ...options, permissions: [] },
  );
  await assert.rejects(() =>
    notificationTarget(denied.context, denied.state, 73),
  );
  assert.equal(denied.cookies.length, 0);
});
