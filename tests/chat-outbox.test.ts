import { test } from "node:test";
import assert from "node:assert/strict";
import { ChatOutbox } from "../src/lib/chat-outbox.ts";
import type { ThreadMessage } from "../src/lib/procurement.ts";

const row = (key: string, outgoing = true): ThreadMessage => ({
  id: 41,
  client_message_id: key,
  content: "Please quote 20 tonnes",
  outgoing,
  seen: false,
  is_deleted: false,
  sent_at: "2026-10-06T12:00:00Z",
  attachments: [],
});
const intent = {
  client_message_id: "intent-a",
  content: "Please quote 20 tonnes",
};

test("chat shows a sending bubble before acknowledgement and keeps it until history confirms", () => {
  const outbox = new ChatOutbox();
  outbox.start(intent);
  assert.equal(
    outbox.messages.get(intent.client_message_id)?.status,
    "Sending…",
  );
  outbox.status(intent.client_message_id, "Sent");
  outbox.reconcile([]);
  assert.equal(outbox.messages.size, 1);
  outbox.reconcile([row(intent.client_message_id)]);
  assert.equal(outbox.messages.size, 0);
});

test("unconfirmed retries reuse one bubble and reject changed text", () => {
  const outbox = new ChatOutbox();
  outbox.start(intent);
  outbox.status(intent.client_message_id, "Not confirmed · Retry");
  outbox.start(intent);
  assert.equal(outbox.messages.size, 1);
  assert.equal(
    outbox.messages.get(intent.client_message_id)?.status,
    "Sending…",
  );
  assert.throws(() => outbox.start({ ...intent, content: "Changed" }));
  assert.equal(
    outbox.messages.get(intent.client_message_id)?.content,
    intent.content,
  );
});

test("reconciliation requires this sender's exact request ID, never matching text", () => {
  const outbox = new ChatOutbox();
  outbox.start(intent);
  outbox.start({ ...intent, client_message_id: "intent-b" });
  outbox.reconcile([row(intent.client_message_id, false), row("unrelated")]);
  assert.equal(outbox.messages.size, 2);
  outbox.reconcile([row(intent.client_message_id)]);
  assert.deepEqual([...outbox.messages.keys()], ["intent-b"]);
});

test("history can confirm before a lost acknowledgement without resurrecting a failed bubble", () => {
  const outbox = new ChatOutbox();
  outbox.start(intent);
  outbox.reconcile([row(intent.client_message_id)]);
  outbox.status(intent.client_message_id, "Not confirmed · Retry");
  outbox.status(intent.client_message_id, "Sent");
  assert.equal(outbox.messages.size, 0);
});
