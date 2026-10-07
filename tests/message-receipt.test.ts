import test from "node:test";
import assert from "node:assert/strict";
import { messageReceipt } from "../src/lib/message-receipt";

test("message receipts distinguish pending, confirmed sent and seen states", () => {
  const pending = messageReceipt("sending"),
    sent = messageReceipt("sent"),
    seen = messageReceipt("seen");
  assert.equal(pending.label, "Sending");
  assert.equal(sent.label, "Sent");
  assert.equal(seen.label, "Seen");
  assert.notEqual(pending.path, sent.path);
  assert.notEqual(sent.path, seen.path);
  assert.equal(seen.className, "message-receipt message-receipt-seen");
});
