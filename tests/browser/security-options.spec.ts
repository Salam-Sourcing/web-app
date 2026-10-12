import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const component = readFileSync(
  new URL("../../src/components/SecurityOptions.astro", import.meta.url),
  "utf8",
);
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles/globals.css"></head><body><main class="container section"><h1>Security &amp; password</h1><p>Choose how you want to manage your account security.</p>${component}</main></body></html>`;
test("security opens with two choices and keyboard navigation selects the intended page", async ({
  page,
}) => {
  await page.route("**/security-options-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.route("**/account/password", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Change password</h1>",
    }),
  );
  await page.route("**/account/two-factor", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Two-factor authentication</h1>",
    }),
  );
  await page.goto("/security-options-fixture");
  const password = page.getByRole("link", { name: /Change password/ });
  const twoFactor = page.getByRole("link", {
    name: /Two-factor authentication/,
  });
  await expect(password).toBeVisible();
  await expect(twoFactor).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);
  await expect(password).toHaveAttribute("href", "/account/password");
  await expect(twoFactor).toHaveAttribute("href", "/account/two-factor");
  await password.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/account\/password$/);
  await page.goto("/security-options-fixture");
  await twoFactor.click();
  await expect(page).toHaveURL(/\/account\/two-factor$/);
});
test("security choices fit small screens and remain visible with enlarged text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/security-options-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/security-options-fixture");
  await page.addStyleTag({
    content:
      ".security-option-copy strong{font-size:25px}.security-option-copy>span{font-size:22px}",
  });
  await expect(
    page.getByRole("link", { name: /Two-factor authentication/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
