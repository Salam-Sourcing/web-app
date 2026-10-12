import { test } from "node:test";
import assert from "node:assert/strict";
import { messageBadge } from "../src/lib/message-badge.ts";
import { unreadMessageCount } from "../src/lib/server/unread-messages.ts";

test("message badges hide zero and cap display while announcing the real count", () => {
  for (const count of [0, -1, NaN, Infinity, "3", null])
    assert.deepEqual(messageBadge(count), {
      hidden: true,
      text: "0",
      label: "Messages",
    });
  assert.deepEqual(messageBadge(1), {
    hidden: false,
    text: "1",
    label: "Messages, 1 unread message",
  });
  assert.deepEqual(messageBadge(130), {
    hidden: false,
    text: "99+",
    label: "Messages, 130 unread messages",
  });
});
test("navigation asks for the entire selected company aggregate without inbox pagination", async () => {
  const state = {
    company: { id: 7 },
    client: {
      rpc: async (name: string, args: unknown) => {
        assert.equal(name, "get_unread_message_count");
        assert.deepEqual(args, { p_company_id: 7 });
        return { data: 130, error: null };
      },
    },
  };
  assert.equal(await unreadMessageCount(state as never), 130);
  assert.equal(await unreadMessageCount({ company: null } as never), 0);
});
test("count request failures cannot silently report zero", async () => {
  const state = {
    company: { id: 7 },
    client: {
      rpc: async () => ({
        data: null,
        error: { code: "42501", message: "Access denied" },
      }),
    },
  };
  await assert.rejects(() => unreadMessageCount(state as never));
});
