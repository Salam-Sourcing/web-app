import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import catalogue from "../parity/countries.json";
import { countryFlagCode } from "../src/lib/country-flags";

test("country flags accept names/codes/aliases and never guess unknown values", () => {
  for (const { input, code } of catalogue.fixtures) {
    assert.equal(countryFlagCode(input), code, input);
  }
  assert.equal(countryFlagCode(null), null);
  for (const code of Object.keys(catalogue.countries)) {
    assert.ok(
      existsSync(new URL(`../public/flags/${code}.svg`, import.meta.url)),
      code,
    );
  }
});
