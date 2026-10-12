import { test, expect } from "@playwright/test";

// Exercise the actual navigation refresh script and production styles with controlled responses.
const fixture =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles/globals.css"></head><body><div id="private-content" data-fingerprint="badge-fixture"><header class="workspace-header"><nav class="workspace-nav"><a href="/messages" data-messages-link><span class="nav-icon"><svg width="20" height="20"><rect width="18" height="16" fill="none" stroke="currentColor"/></svg><span class="message-nav-count" data-message-count aria-hidden="true" hidden></span></span>Messages</a></nav></header><nav class="mobile-dock"><a href="/messages" data-messages-link><span class="nav-icon"><svg width="20" height="20"><rect width="18" height="16" fill="none" stroke="currentColor"/></svg><span class="message-nav-count" data-message-count aria-hidden="true" hidden></span></span><span>Messages</span></a></nav></div><script type="module">import {bindNotifications} from "/src/scripts/notifications.ts";bindNotifications();</script></body></html>';

test("header and phone dock show unread totals, clear on read and reject stale company responses", async ({
  page,
}) => {
  let count = 130;
  let fingerprint = "badge-fixture";
  await page.route("**/api/notifications", (route) =>
    route.fulfill({
      json: { fingerprint, unread: 2, unreadMessages: count, rows: [] },
    }),
  );
  await page.route("**/message-badge-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/message-badge-fixture");
  const badges = page.locator("[data-message-count]");
  await expect(badges).toHaveText(["99+", "99+"]);
  await expect(page.locator("[data-messages-link]").first()).toHaveAttribute(
    "aria-label",
    "Messages, 130 unread messages",
  );
  count = 1;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("salam-messages-changed")),
  );
  await expect(badges).toHaveText(["1", "1"]);
  count = 0;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("salam-messages-changed")),
  );
  await expect(badges.nth(0)).toBeHidden();
  await expect(badges.nth(1)).toBeHidden();
  await expect(page.locator("[data-messages-link]").first()).toHaveAttribute(
    "aria-label",
    "Messages",
  );
  fingerprint = "other-company";
  count = 4;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("salam-messages-changed")),
  );
  await page.waitForTimeout(200);
  await expect(badges.nth(0)).toBeHidden();
  await expect(badges.nth(1)).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("a read completed during a pending poll triggers a fresh count and private badges clear on lock", async ({
  page,
}) => {
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/notifications", async (route) => {
    const first = ++requests === 1;
    if (first) await pending;
    await route.fulfill({
      json: {
        fingerprint: "badge-fixture",
        unread: 0,
        unreadMessages: first ? 8 : 0,
        rows: [],
      },
    });
  });
  await page.route("**/message-badge-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/message-badge-fixture");
  await expect.poll(() => requests).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("salam-messages-changed")),
  );
  release();
  await expect.poll(() => requests).toBe(2);
  await expect(page.locator("[data-messages-link]").first()).toHaveAttribute(
    "aria-label",
    "Messages",
  );
  await expect(page.locator("[data-message-count]").first()).toBeHidden();
  await page.evaluate(async () => {
    const moduleUrl = "/src/lib/message-badge.ts";
    const { updateMessageBadges } = await import(/* @vite-ignore */ moduleUrl);
    const content = document.querySelector<HTMLElement>("#private-content")!;
    updateMessageBadges(content, 4);
    content.hidden = true;
  });
  await expect(page.locator("[data-messages-link]").first()).toHaveAttribute(
    "aria-label",
    "Messages",
  );
});
