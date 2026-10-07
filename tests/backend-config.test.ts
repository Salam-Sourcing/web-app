import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedBackend } from "../src/lib/backend-config.ts";
const token = (role: string) =>
  "header." +
  Buffer.from(JSON.stringify({ role })).toString("base64url") +
  ".signature";
test("release builds never accept fixture endpoints, legacy keys or service roles", () => {
  for (const development of [false, true])
    for (const fixture of [false, true]) {
      assert.equal(
        allowedBackend(
          "http://127.0.0.1:55431",
          token("service_role"),
          development,
          fixture,
        ),
        false,
      );
      assert.equal(
        allowedBackend(
          "http://127.0.0.1:55431",
          token("anon"),
          development,
          fixture,
        ),
        development && fixture,
      );
      assert.equal(
        allowedBackend(
          "http://production.example.test",
          token("anon"),
          development,
          fixture,
        ),
        false,
      );
      assert.equal(
        allowedBackend(
          "https://example.supabase.co",
          token("service_role"),
          development,
          fixture,
        ),
        false,
      );
    }
  assert.equal(
    allowedBackend("https://example.supabase.co", "sb_publishable_fixture"),
    true,
  );
  assert.equal(
    allowedBackend("http://127.0.0.1:55431", "invalid", true, true),
    false,
  );
});
