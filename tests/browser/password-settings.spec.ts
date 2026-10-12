import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Render the actual component with real browser scripts; all API responses are isolated.
const component = readFileSync(
  new URL("../../src/components/PasswordChangeForm.astro", import.meta.url),
  "utf8",
);
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles/globals.css"></head><body><main class="container narrow section"><section class="card security-section"><h1>Change your password</h1>${component}</section></main><script type="module">import {bindForms} from '/src/scripts/forms.ts';import {bindPasswordSettings} from '/src/scripts/password-settings.ts';bindForms();bindPasswordSettings();</script></body></html>`;
test.beforeEach(async ({ page }) => {
  await page.route("**/password-settings-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
});
test("code request is visible before typing a password and includes clear next steps", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/auth/reauthenticate", (route) => {
    requests++;
    return route.fulfill({
      json: { message: "Check your email for the verification code." },
    });
  });
  await page.goto("/password-settings-fixture");
  const send = page.getByRole("button", {
    name: "Send verification code",
    exact: true,
  });
  await expect(send).toBeVisible();
  await expect(page.locator('[name="nonce"]')).not.toHaveAttribute("required");
  await send.click();
  await expect(
    page.getByText("Check your email for the verification code.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('[name="nonce"]')).toHaveAttribute("required", "");
  await expect(page.locator('[name="nonce"]')).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Send a new code" }),
  ).toBeEnabled();
  await expect(page.locator("[data-password-code-help]")).toContainText(
    "latest code",
  );
  expect(requests).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("password-settings.png"),
    fullPage: true,
  });
});
test("password submission sends current password and code, handles errors and resends", async ({
  page,
}) => {
  let submitted: Record<string, string> | undefined;
  let fail = true;
  await page.route("**/api/auth/password", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill(
      fail
        ? {
            status: 400,
            json: {
              code: "reauthentication_not_valid",
              error: "The verification code is invalid or expired.",
            },
          }
        : { json: { message: "Your password was updated." } },
    );
  });
  await page.route("**/api/auth/reauthenticate", (route) =>
    route.fulfill({
      json: { message: "Check your email for the verification code." },
    }),
  );
  await page.goto("/password-settings-fixture");
  await page.locator('[name="current_password"]').fill(" current secret ");
  await page.locator('[name="password"]').fill("new-secret-password");
  await page.locator('[name="confirm_password"]').fill("new-secret-password");
  await page.locator('[name="nonce"]').fill("12345678");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid or expired");
  expect(submitted).toEqual({
    current_password: " current secret ",
    password: "new-secret-password",
    confirm_password: "new-secret-password",
    nonce: "12345678",
  });
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(page.locator('[name="nonce"]')).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[name="password"]')).toHaveValue(
    "new-secret-password",
  );
  await page.locator('[name="nonce"]').fill("87654321");
  fail = false;
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(
    page.locator("[data-password-form] [data-form-message]"),
  ).toHaveText("Your password was updated.");
  expect(submitted?.nonce).toBe("87654321");
});
test("failed code request leaves recovery available and current-password errors focus the field", async ({
  page,
}) => {
  await page.route("**/api/auth/reauthenticate", (route) =>
    route.fulfill({
      status: 429,
      json: {
        code: "over_email_send_rate_limit",
        error: "Please wait before requesting another email.",
      },
    }),
  );
  await page.route("**/api/auth/password", (route) =>
    route.fulfill({
      status: 400,
      json: {
        code: "current_password_required",
        error: "Enter your current password to change it.",
      },
    }),
  );
  await page.goto("/password-settings-fixture");
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Please wait before requesting another email.",
  );
  await expect(page.locator('[name="nonce"]')).not.toHaveAttribute("required");
  await expect(
    page.getByRole("link", { name: "Forgot your password?" }),
  ).toHaveAttribute("href", "/forgot-password");
  await page.locator('[name="password"]').fill("new-secret-password");
  await page.locator('[name="confirm_password"]').fill("new-secret-password");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.locator('[name="current_password"]')).toBeFocused();
  await page.locator("[data-password-form] .password-toggle").first().click();
  await expect(page.locator('[name="current_password"]')).toHaveAttribute(
    "type",
    "text",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(page.locator('[name="current_password"]')).toHaveAttribute(
    "type",
    "password",
  );
});
