import { test, expect } from "@playwright/test";
test("public information and auth pages remain usable on narrow screens", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of [
    "/platform",
    "/get-the-app",
    "/buyers",
    "/vendors",
    "/login",
    "/signup",
    "/forgot-password",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
    await expect(
      page
        .getByRole("link", { name: "Salam Sourcing Marketplace home" })
        .first(),
    ).toBeVisible();
    const header = page.locator(".site-header");
    await expect(
      header.getByRole("link", { name: "Log in", exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole("link", { name: "Join free", exact: true }),
    ).toBeVisible();
    if (path === "/platform" || path === "/get-the-app") {
      const faq = page.locator(".marketing-faq details").first();
      await faq.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(faq.locator("p")).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(faq.locator("p")).not.toBeVisible();
    }
  }
});
for (const submission of ["Search", "Apply filters", "Enter"] as const) {
  test(`public browse preserves choices and requires sign-in via ${submission}`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.locator("[data-public-browse]")).toBeVisible();
    const query = page.locator('input[name="query"]');
    await query.fill("steel");
    const form = page.locator("[data-public-search]");
    await form.getByText("Refine your search", { exact: true }).click();
    await form.locator('[name="location"]').fill("Edmonton");
    await form.locator('[name="currency"]').fill("CAD");
    await form.locator('[name="min_price"]').fill("10");
    await form.locator('[name="max_price"]').fill("100");
    await form.locator('[name="sort"]').selectOption("price_low");
    await form.locator('[name="verified"]').check();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    if (submission === "Enter") await query.press("Enter");
    else
      await form.getByRole("button", { name: submission, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    for (const [selector, path] of [
      ["[data-prompt-login]", "/login"],
      ["[data-prompt-signup]", "/signup"],
    ]) {
      const link = new URL(
        (await page.locator(selector).getAttribute("href"))!,
        page.url(),
      );
      expect(link.pathname).toBe(path);
      const next = new URL(link.searchParams.get("next")!, page.url());
      expect(next.pathname).toBe("/discover");
      for (const [key, value] of Object.entries({
        query: "steel",
        location: "Edmonton",
        currency: "CAD",
        min_price: "10",
        max_price: "100",
        sort: "price_low",
        verified: "true",
      }))
        expect(next.searchParams.get(key)).toBe(value);
    }
    await page.getByRole("button", { name: "Close sign-in prompt" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(query).toHaveValue("steel");
    await expect(form.locator('[name="location"]')).toHaveValue("Edmonton");
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
}

test("invalid public filters remain editable without opening sign-in", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator("[data-public-search]");
  await form.getByText("Refine your search", { exact: true }).click();
  const currency = form.locator('[name="currency"]');
  await currency.fill("CA");
  await form
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await currency.evaluate(
      (input: HTMLInputElement) => input.validity.patternMismatch,
    ),
  ).toBe(true);
  await currency.fill("CAD");
  await form
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("private pages redirect to login and legacy /app links use current routes", async ({
  page,
}) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/app/discover");
  await expect(page).toHaveURL(/\/login\?next=%2Fdiscover/);
});
