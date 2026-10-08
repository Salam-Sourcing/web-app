import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalogue = JSON.parse(
  readFileSync(new URL("../../parity/plans.json", import.meta.url), "utf8"),
) as {
  notice: string;
  plans: {
    id: string;
    name: string;
    monthly: number;
    annual: number;
    users: number;
    listings: number;
    enquiries: number;
    savedSearches: number;
    alerts: string;
    insights: string;
    support: string;
  }[];
  sharedFeatures: string[];
  trial: string;
  downgrade: string;
};

for (const width of [320, 390, 1280]) {
  test(`proposed catalogue fits ${width}px and cannot activate plans`, async ({
    page,
  }, info) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
        writes.push(request.url());
    });
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/plans");
    await page.evaluate(() => document.fonts.ready);
    const preview = page.locator("[data-plan-preview]");
    await expect(preview).toContainText(catalogue.notice);
    await expect(preview.locator("[data-plan]")).toHaveCount(3);
    for (const plan of catalogue.plans) {
      const card = preview.locator(`[data-plan="${plan.id}"]`);
      await expect(
        card.getByRole("heading", { name: plan.name, exact: true }),
      ).toBeVisible();
      await expect(card.locator(".plan-preview-price strong")).toHaveText(
        plan.monthly === 0 ? "Free" : `$${plan.monthly} CAD`,
      );
      await expect(card.locator(".plan-preview-price p")).toHaveText(
        plan.annual === 0
          ? "No subscription charge"
          : `$${plan.annual} CAD per year · Two months free`,
      );
      for (const [label, value] of [
        ["Users, including owner", plan.users],
        ["Non-archived listings", plan.listings],
        ["New enquiries / month", plan.enquiries],
        ["Saved searches / user", plan.savedSearches],
        ["Matching alerts", plan.alerts],
        ["Supplier insights", plan.insights],
        ["Support", plan.support],
      ]) {
        await expect(
          card
            .locator("dl > div")
            .filter({ has: page.getByText(String(label), { exact: true }) })
            .locator("dd"),
        ).toHaveText(String(value));
      }
      await card.getByRole("heading").click();
      await expect(page).toHaveURL(/\/plans$/);
    }
    await expect(
      preview.locator("button, a, form, input, select, [role=button]"),
    ).toHaveCount(0);
    await expect(preview.locator(".plan-preview-shared li")).toHaveCount(
      catalogue.sharedFeatures.length,
    );
    await expect(preview).toContainText(catalogue.trial);
    await expect(preview).toContainText(catalogue.downgrade);
    expect(
      writes,
      "Reading or clicking preview cards must not create a billing request",
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`plans-${width}.png`),
      fullPage: true,
    });
  });
}

test("plan preview fits a small phone with enlarged text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/plans");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-plan-preview] :is(p, span, h2, h3, strong, dt, dd)",
    );
    const sizes = Array.from(
      nodes,
      (node) =>
        [node, Number.parseFloat(getComputedStyle(node).fontSize)] as const,
    );
    for (const [node, size] of sizes) node.style.fontSize = `${size * 1.8}px`;
  });
  await expect(page.locator("[data-plan=business] h3")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
