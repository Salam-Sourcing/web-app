import catalogue from "../../parity/countries.json";

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s.'’(),_-]/g, "");
const codes = new Map<string, string>();
for (const [code, names] of Object.entries(catalogue.countries)) {
  if (!/^[a-z]{2}$/.test(code)) continue;
  for (const name of [code, ...names]) codes.set(normalize(name), code);
}

/** Exact catalogue matches only; no guesses or user-controlled asset paths. */
export function countryFlagCode(
  country: string | null | undefined,
): string | null {
  return country ? (codes.get(normalize(country)) ?? null) : null;
}
