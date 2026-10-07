import { test, expect } from "@playwright/test";
test("public browse permits input and requires sign-in when submitted", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator("[data-public-browse]")).toBeVisible();
  const query = page.locator('input[name="query"]');
  await query.fill("steel");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator('[data-public-search] button[type="submit"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-prompt-login]")).toHaveAttribute(
    "href",
    /next=/,
  );
  await page.getByRole("button", { name: "Close sign-in prompt" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: info.outputPath("browse.png"),
    fullPage: true,
  });
});
test("private pages redirect to login and legacy /app links use current routes", async ({
  page,
}) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/app/discover");
  await expect(page).toHaveURL(/\/login\?next=%2Fdiscover/);
});
