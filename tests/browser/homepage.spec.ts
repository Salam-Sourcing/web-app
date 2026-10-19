import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const home = JSON.parse(
  readFileSync(new URL("../../parity/homepage.json", import.meta.url), "utf8"),
) as { sectors: { id: string; name: string; topics: string[] }[] };
test("every home sector opens its topic list and preserves a topic through sign-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const sector of home.sectors) {
    await page.goto("/");
    await page.locator(".home-sector").filter({ hasText: sector.name }).click();
    await expect(page).toHaveURL(
      new RegExp("/categories\\?sector=" + sector.id),
    );
    await expect(page.locator("h1")).toHaveText(sector.name);
    for (const topic of sector.topics) {
      const link = page
        .locator(".home-category-section")
        .first()
        .getByRole("link", { name: topic, exact: true });
      const url = new URL((await link.getAttribute("href"))!, page.url());
      expect(url.pathname).toBe("/discover");
      expect(url.searchParams.get("query")).toBe(topic);
    }
    await page
      .locator(".home-category-section")
      .first()
      .getByRole("link", { name: sector.topics[0], exact: true })
      .click();
    await expect(page).toHaveURL(/\/login\?next=/);
    const next = new URL(
      new URL(page.url()).searchParams.get("next")!,
      page.url(),
    );
    expect(next.searchParams.get("query")).toBe(sector.topics[0]);
  }
});
test("planned events and guided overview have working actions without fake bookings", async ({
  page,
}) => {
  await page.goto("/trade-events");
  await expect(
    page.getByText("Planning stage · No confirmed dates or venues"),
  ).toBeVisible();
  for (const link of await page.locator('a[href^="mailto:"]').all()) {
    expect(await link.getAttribute("href")).toContain(
      "support@salamsourcing.com",
    );
  }
  await page.goto("/");
  const overview = page.locator("[data-sourcing-demo]");
  await overview.getByRole("button", { name: "Play overview" }).click();
  await expect(
    overview.getByRole("button", { name: "Pause overview" }),
  ).toHaveAttribute("aria-pressed", "true");
  await overview.getByRole("button", { name: "Pause overview" }).click();
  await expect(
    overview.getByRole("button", { name: "Play overview" }),
  ).toHaveAttribute("aria-pressed", "false");
});
