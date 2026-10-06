import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import { notificationTarget } from "../src/lib/server/notification-target.ts";
import { AccessError } from "../src/lib/security.ts";

function fixture(notification: any, rpcError = false) {
  const calls: any[] = [],
    cookies: any[] = [];
  const client = {
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
        maybeSingle: async () => ({ data: notification, error: null }),
      };
      return query;
    },
    rpc: async (name: string, args: unknown) => {
      calls.push(["rpc", name, args]);
      return {
        data: [],
        error: rpcError
          ? { code: "P0001", message: "Search unavailable" }
          : null,
      };
    },
  };
  const state = {
    client,
    user: { id: "current-user" },
    company: { id: 4 },
    companies: [{ id: 4 }],
    permissions: [],
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
    data: { redirect: "/app/deals/99" },
  });
  assert.deepEqual(await notificationTarget(f.context, f.state, 73), {
    redirect: "/app/account/searches/12",
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
