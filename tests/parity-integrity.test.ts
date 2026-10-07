import { test } from "node:test";
import assert from "node:assert/strict";
import { businessNumber, BUSINESS_MAX } from "../src/lib/business-numbers.ts";
import {
  catalogRequestLimit,
  procurementRequestLimit,
} from "../src/lib/request-limits.ts";
import { listingPayload } from "../src/lib/catalog.ts";
import {
  enquiryPayload,
  quotePayload,
  type Enquiry,
} from "../src/lib/procurement.ts";
import { AccessError, readMutation } from "../src/lib/security.ts";

test("business values reject rounding, overflow and exponent input before storage", () => {
  for (const raw of ["0.001", "1000000000000", "1e3", "-1", true])
    assert.throws(() => businessNumber(raw, "price"), AccessError);
  for (const raw of ["999999999999.99", "1.2300", "0.01"])
    assert.equal(businessNumber(raw, "price"), Number(raw));
  assert.throws(
    () => businessNumber("1.0", "lead", { integer: true }),
    AccessError,
  );
  assert.equal(businessNumber(BUSINESS_MAX, "price"), BUSINESS_MAX);
  assert.throws(
    () => businessNumber("36501", "lead", { integer: true }),
    AccessError,
  );
  assert.equal(
    businessNumber("36501", "lead", { integer: true, existing: 36501 }),
    36501,
  );
  assert.throws(
    () => businessNumber("36502", "lead", { integer: true, existing: 36501 }),
    AccessError,
  );
});

test("positive quantity and quote totals cannot round to zero", () => {
  const enquiry = {
    title: "Parts",
    message: "Requirements",
    enquiry_type: "public_rfq",
    currency: "CAD",
    quote_deadline: "2099-01-01T12:00:00Z",
  };
  for (const total_price of ["0", "0.001"])
    assert.throws(
      () =>
        quotePayload(
          { total_price, currency: "CAD", valid_until: "2099-01-01T12:00:00Z" },
          2,
          { id: 1 } as Enquiry,
        ),
      AccessError,
    );
  for (const quantity of ["0", "0.001"])
    assert.throws(
      () => enquiryPayload({ ...enquiry, quantity }, 1),
      AccessError,
    );
});

test("request budgets cover valid multibyte and JSON escaped form values", async () => {
  const url = "https://web.example.test/api/procurement/save-enquiry";
  const makeRequest = (payload: unknown) =>
    new Request(url, {
      method: "POST",
      headers: {
        Origin: "https://web.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  const rfq = {
    title: "Parts",
    message: "漢".repeat(8000),
    enquiry_type: "public_rfq",
    currency: "CAD",
    quote_deadline: "2099-01-01T12:00:00Z",
  };
  const quote = {
    notes: "漢".repeat(5000),
    payment_terms: "漢".repeat(1000),
    shipping_terms: "漢".repeat(1000),
    total_price: "1",
    currency: "CAD",
    valid_until: "2099-01-01T12:00:00Z",
  };
  assert.equal(enquiryPayload(rfq, 1).message, rfq.message);
  assert.equal(quotePayload(quote, 2, { id: 1 } as Enquiry).notes, quote.notes);
  for (const [action, payload] of [
    ["save-enquiry", rfq],
    ["quote", quote],
  ] as const) {
    assert.ok(Buffer.byteLength(JSON.stringify(payload)) > 16384);
    await assert.rejects(() => readMutation(makeRequest(payload)), AccessError);
    assert.deepEqual(
      await readMutation(makeRequest(payload), procurementRequestLimit(action)),
      payload,
    );
  }
  const listing = {
    listing_type: "product",
    name: "Parts",
    description: "漢".repeat(6000),
    sub_category_id: "2",
    unit_of_measure: "units",
    specifications: JSON.stringify(
      Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [String(i), "\u0001".repeat(500)]),
      ),
    ),
  };
  assert.equal(Object.keys(listingPayload(listing).specifications).length, 30);
  assert.deepEqual(
    await readMutation(
      makeRequest(listing),
      catalogRequestLimit("listing-create"),
    ),
    listing,
  );
  assert.equal(catalogRequestLimit("remove"), 16384);
  assert.equal(procurementRequestLimit("close"), 16384);
});
