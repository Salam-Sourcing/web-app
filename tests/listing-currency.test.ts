import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currencies,
  preferredCurrency,
  listingPriceDisplay,
  convertedPrice,
} from "../src/lib/listing-currency.ts";
const now = Date.parse("2026-10-07T12:00:00Z");
const rates = [
  { base: "USD", quote: "CAD", rate: 1.25, date: "2026-10-06" },
  { base: "USD", quote: "EUR", rate: 0.875, date: "2026-10-07" },
  { base: "USD", quote: "JPY", rate: 150, date: "2026-10-07" },
  { base: "USD", quote: "PKR", rate: 280, date: "2026-10-07" },
  { base: "USD", quote: "KWD", rate: 0.307, date: "2026-10-07" },
];
test("cross rates, units, originals and observation dates", () => {
  for (const [target, expected] of [
    ["USD", "31.20"],
    ["EUR", "27.30"],
    ["JPY", "4,680"],
    ["PKR", "8,736.00"],
    ["KWD", "9.578"],
  ]) {
    const value = listingPriceDisplay(
      39,
      "CAD",
      "roll",
      { currency: target, rates },
      now,
    );
    assert.equal(value.price, `≈ ${target} ${expected} / roll`);
    assert.equal(value.note, "Original: CAD 39.00 / roll · Rate: 2026-10-06");
  }
  assert.equal(convertedPrice(10, "USD", "EUR", rates, now)?.amount, 8.75);
});
test("original mode, identity and fractional unit prices retain supplier precision", () => {
  for (const currency of [null, "CAD"]) {
    assert.deepEqual(
      listingPriceDisplay(0.001, "CAD", "piece", { currency, rates }, now),
      { price: "CAD 0.001 / piece", note: "" },
    );
  }
  assert.equal(
    listingPriceDisplay(0.001, "CAD", "piece", { currency: "USD", rates }, now)
      .price,
    "≈ USD 0.0008 / piece",
  );
  assert.equal(
    listingPriceDisplay(0, "CAD", "kg", { currency: "USD", rates }, now).price,
    "≈ USD 0.00 / kg",
  );
});
test("missing, stale, zero, negative, infinite and future rates never manufacture a conversion", () => {
  for (const bad of [
    [],
    rates.map((r) => ({ ...r, date: "2026-09-01" })),
    rates.map((r) => ({ ...r, date: "2027-01-01" })),
    rates.map((r) => ({ ...r, rate: 0 })),
    rates.map((r) => ({ ...r, rate: -1 })),
    rates.map((r) => ({ ...r, rate: Infinity })),
  ]) {
    assert.deepEqual(
      listingPriceDisplay(
        39,
        "CAD",
        "roll",
        { currency: "EUR", rates: bad },
        now,
      ),
      {
        price: "CAD 39.00 / roll",
        note: "Conversion unavailable · Original price",
      },
    );
  }
  assert.equal(convertedPrice(NaN, "CAD", "USD", rates, now), null);
  assert.equal(convertedPrice(-39, "CAD", "USD", rates, now), null);
  assert.equal(convertedPrice(39, "XXX", "USD", rates, now), null);
});
test("only supported, exact currency choices are accepted", () => {
  assert.equal(preferredCurrency(""), null);
  assert.equal(preferredCurrency(null), null);
  for (const c of currencies) assert.equal(preferredCurrency(c.code), c.code);
  for (const value of [undefined, "usd", " USD ", "XXX", 42, {}, ["USD"]])
    assert.throws(() => preferredCurrency(value));
  assert.equal(new Set(currencies.map((c) => c.code)).size, currencies.length);
  assert.ok(currencies.every((c) => /^[A-Z]{3}$/.test(c.code)));
});
