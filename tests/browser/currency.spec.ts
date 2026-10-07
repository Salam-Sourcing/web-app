import { test, expect } from "@playwright/test";
const today = () => new Date().toISOString().slice(0, 10);
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles/globals.css"></head><body><main class="container" data-fingerprint="fixture-account"><section class="card currency-settings"><h1>Display currency</h1><label class="field">Listing display currency<select data-currency-select><option value="USD">USD · US dollar</option><option value="">Original supplier currency</option></select></label><div data-currency-preview><article class="listing-price-display" data-listing-price data-amount="39" data-currency="CAD" data-unit="roll"><strong data-price-value>CAD 39.00 / roll</strong><small data-price-note class="help-text" hidden></small></article></div><div id="more-prices"></div></section></main><script type="module">import {bindListingPrices,bindCurrencyPreview} from '/src/scripts/listing-currency.ts';bindListingPrices();bindCurrencyPreview();document.addEventListener('append-price',()=>{const copy=document.querySelector('[data-listing-price]').cloneNode(true);delete copy.dataset.currencyBound;document.querySelector('#more-prices').append(copy);bindListingPrices(document.querySelector('#more-prices'));});</script></body></html>`;
test("listing prices load, convert, preview and update newly appended cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/listing-currency*", async (route) => {
    await pending;
    await route.fulfill({
      json: {
        fingerprint: "fixture-account",
        currency: "USD",
        rates: [{ base: "USD", quote: "CAD", rate: 1.25, date: today() }],
      },
    });
  });
  await page.route("**/currency-test-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/currency-test-fixture");
  await expect(page.locator("[data-listing-price]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.getByText("Checking display currency…")).toBeVisible();
  release();
  await expect(page.getByText("≈ USD 31.20 / roll")).toBeVisible();
  await expect(page.locator("[data-price-note]")).toHaveText(
    `Original: CAD 39.00 / roll · Rate: ${today()}`,
  );
  await page.evaluate(() => document.dispatchEvent(new Event("append-price")));
  await expect(page.locator("#more-prices [data-price-value]")).toHaveText(
    "≈ USD 31.20 / roll",
  );
  await page.locator("[data-currency-select]").selectOption("");
  await expect(
    page.locator("[data-currency-preview] [data-price-value]"),
  ).toHaveText("CAD 39.00 / roll");
  await expect(
    page.locator("[data-currency-preview] [data-price-note]"),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("a changed account or failed request leaves supplier prices visible", async ({
  page,
}) => {
  await page.route("**/api/listing-currency*", (route) =>
    route.fulfill({
      json: { fingerprint: "another-account", currency: "EUR", rates: [] },
    }),
  );
  await page.route("**/currency-test-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/currency-test-fixture");
  await expect(page.locator("[data-price-value]")).toHaveText(
    "CAD 39.00 / roll",
  );
  await expect(page.locator("[data-price-note]")).toHaveText(
    "Original price · Currency settings unavailable",
  );
  await expect(page.locator("[data-listing-price]")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
});
