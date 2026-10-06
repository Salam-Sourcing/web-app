import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const worker = readFileSync(
  new URL("../public/push-worker.js", import.meta.url),
  "utf8",
);
function fixture(
  response: any = { user_id: "user", session_id: "session", is_test: false },
  ok = true,
) {
  const handlers: Record<string, (event: any) => void> = {},
    shown: any[] = [],
    opened: string[] = [],
    requests: any[] = [];
  const self = {
    addEventListener: (type: string, fn: any) => (handlers[type] = fn),
    registration: {
      showNotification: async (...args: any[]) => shown.push(args),
    },
    clients: { openWindow: async (url: string) => opened.push(url) },
  };
  vm.runInNewContext(worker, {
    self,
    AbortSignal,
    fetch: async (url: string, options: any) => {
      requests.push({ url, options });
      return { ok, json: async () => response };
    },
  });
  async function push(data: any) {
    let pending: Promise<any> | undefined;
    handlers.push({
      data: { json: () => ({ data }) },
      waitUntil: (p: Promise<any>) => (pending = p),
    });
    await pending;
  }
  async function click(data: any) {
    let pending: Promise<any> | undefined;
    handlers.notificationclick({
      notification: { data, close() {} },
      waitUntil: (p: Promise<any>) => (pending = p),
    });
    await pending;
  }
  return { push, click, shown, opened, requests };
}
const data = {
  type: "new_message",
  notification_id: "12",
  recipient_user_id: "user",
  recipient_session_id: "session",
};
test("background push validates the current stored notification and cookie session", async () => {
  const f = fixture();
  await f.push({ ...data, body: "SECRET MESSAGE" });
  assert.equal(f.shown.length, 1);
  assert.equal(f.requests[0].url, "/api/push/validate");
  assert.equal(f.requests[0].options.credentials, "same-origin");
  assert.equal(f.requests[0].options.cache, "no-store");
  assert.equal(JSON.stringify(f.shown).includes("SECRET"), false);
});
test("logged out, foreign account and stale session pushes show nothing", async () => {
  for (const f of [
    fixture(null, false),
    fixture({ user_id: "other", session_id: "session" }),
    fixture({ user_id: "user", session_id: "revoked" }),
  ]) {
    await f.push(data);
    assert.equal(f.shown.length, 0);
  }
});
test("notification click rejects stale recipients and never trusts payload URLs", async () => {
  const f = fixture();
  await f.click({
    id: "12",
    user_id: "user",
    session_id: "session",
    url: "https://attacker.invalid",
  });
  assert.deepEqual(f.opened, ["/notifications/12"]);
  const stale = fixture({ user_id: "new-user", session_id: "new-session" });
  await stale.click({ id: "12", user_id: "user", session_id: "session" });
  assert.equal(stale.opened.length, 0);
});
test("malformed push IDs and arbitrary routes are ignored", async () => {
  const f = fixture();
  await f.push({ ...data, notification_id: "../auth/callback?code=bad" });
  await f.click({ id: "https://attacker.invalid" });
  assert.equal(f.requests.length, 0);
});
