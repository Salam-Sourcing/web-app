import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import { POST } from "../src/pages/api/client-error.ts";

test("diagnostic endpoint records a bounded group and compiled location only after workspace access", async () => {
  const logs: string[] = [];
  const warn = console.warn;
  console.warn = (value: unknown) => logs.push(String(value));
  const event = {
    category: "uncaught_error",
    kind: "TypeError",
    frames: [{ asset: "/_astro/messages.B1abcdef.js", line: 23, column: 19 }],
  };
  const request = (body: unknown, origin = "https://test.salamsourcing.com") =>
    new Request("https://test.salamsourcing.com/api/client-error", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const run = (body: unknown, locals: unknown, origin?: string) =>
    POST({ request: request(body, origin), locals } as APIContext);
  try {
    // A middleware-verified workspace, as consumed by requireWorkspace.
    const locals = { workspace: { user: { id: "private-user" } } };
    const response = await run(event, locals);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
    assert.equal(logs.length, 1);
    const receipt = JSON.parse(logs[0]);
    assert.match(receipt.group, /^web-[0-9a-f]{8}$/);
    assert.deepEqual(receipt, {
      event: "marketplace_client_error",
      schema: 1,
      group: receipt.group,
      ...event,
    });
    assert.ok(!logs[0].includes("private-user"));
    assert.equal(
      (await run({ ...event, message: "private message" }, locals)).status,
      400,
    );
    assert.equal(
      (await run({ ...event, stack: "private stack" }, locals)).status,
      400,
    );
    assert.equal(
      (await run(event, locals, "https://other.invalid")).status,
      403,
    );
    assert.equal(
      (await run({ category: "x".repeat(4100) }, locals)).status,
      413,
    );
    const signedOut = {
      supabase: {
        auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      },
    };
    assert.equal((await run(event, signedOut)).status, 401);
    assert.equal(
      logs.length,
      1,
      "Rejected events must not reach diagnostic logging",
    );
  } finally {
    console.warn = warn;
  }
});
