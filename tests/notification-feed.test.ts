import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationPresentation } from "../src/lib/notification-display.ts";
import { notificationFeed } from "../src/lib/server/notification-feed.ts";
test("in-app messages show the exact authorized sender, preview and enquiry context", () => {
  const notice = notificationPresentation({
    notification_type: "new_message",
    title: "New message",
    body: "Open Salam to view the details.",
    source_name: "Acme Supply",
    preview: "Photo · Package ready",
    context_name: "Packaging enquiry",
  });
  assert.equal(notice.source, "Acme Supply");
  assert.equal(notice.preview, "Photo · Package ready");
  assert.equal(notice.context, "Packaging enquiry");
  assert.equal(notice.openLabel, "Open conversation");
});
test("missing or deleted message details never invent a sender or latest-message preview", () => {
  const view = notificationPresentation({
    notification_type: "new_message",
    title: "New message",
    body: "Open Salam to view the details.",
    source_name: null,
    preview: null,
  });
  assert.equal(view.source, "Conversation update");
  assert.equal(view.preview, "Open this update to see the details.");
});
test("enquiry notifications explain the event and the originating business", () => {
  const view = notificationPresentation({
    notification_type: "new_enquiry",
    title: "Company update",
    body: "Open Salam to view the details.",
    source_name: "Acme Buyer",
    preview: "Carton supply request",
  });
  assert.equal(view.title, "New enquiry");
  assert.equal(view.source, "Acme Buyer");
  assert.equal(view.openLabel, "View enquiry");
});
test("shared feed uses bounded RLS projection and keeps navigation metadata out of display rows", async () => {
  const state = {
    client: {
      rpc: async (name: string, args: unknown) => {
        assert.equal(name, "get_notification_feed");
        assert.deepEqual(args, { p_limit: 100 });
        return {
          error: null,
          data: [
            {
              id: 1,
              notification_type: "new_message",
              entity_type: "conversation",
              entity_id: 5,
              data: { link_url: "https://evil.invalid" },
              preview: "Original message",
              source_name: "Acme",
            },
          ],
        };
      },
    },
  };
  const rows = await notificationFeed(state as never);
  assert.equal(rows[0].preview, "Original message");
  assert.equal(rows[0].can_open, true);
  assert.equal("data" in rows[0], false);
});
