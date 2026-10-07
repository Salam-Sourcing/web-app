import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  businessNumber,
  BUSINESS_MAX,
  LEAD_DAYS_MAX,
} from "../src/lib/business-numbers.ts";
import {
  MESSAGE_LIMIT,
  REPORT_LIMIT,
  companyLimits,
} from "../src/lib/client-contracts.ts";
import { statusLabel } from "../src/lib/status-label.ts";
const contract = JSON.parse(
  readFileSync(new URL("../parity/contract.json", import.meta.url), "utf8"),
);
test("shared contract pins both clients to the same field boundaries", () => {
  assert.equal(MESSAGE_LIMIT, contract.boundaries.messageLimit);
  assert.equal(REPORT_LIMIT, contract.boundaries.reportLimit);
  assert.equal(BUSINESS_MAX, contract.boundaries.businessMaximum);
  assert.equal(LEAD_DAYS_MAX, contract.boundaries.leadDaysMaximum);
  assert.deepEqual(companyLimits, contract.boundaries.companyLimits);
});
for (const item of contract.numbers)
  test(`shared numeric contract: ${item.raw}, integer=${item.integer}`, () => {
    const call = () =>
      businessNumber(item.raw, "value", { integer: item.integer });
    if (item.valid) assert.equal(call(), Number(item.raw));
    else assert.throws(call);
  });
test("release checklist has unique acceptance IDs and explicitly defers only browser push", () => {
  assert.equal(
    new Set(contract.acceptance.map((s: any) => s.id)).size,
    contract.acceptance.length,
  );
  assert.deepEqual(
    contract.policy.deferred.map((s: any) => s.id),
    ["browser-push"],
  );
  assert.equal(contract.screens.length, 37);
});

test("new web pages require a shared acceptance inventory update", () => {
  const pages = readdirSync(new URL("../src/pages/", import.meta.url), {
    recursive: true,
  })
    .filter((p) => typeof p === "string" && p.endsWith(".astro"))
    .sort();
  assert.deepEqual(pages, contract.webPages);
});

for (const item of contract.statusLabels)
  test(`shared status label: ${JSON.stringify(item.raw)}`, () => {
    assert.equal(statusLabel(item.raw), item.label);
  });
