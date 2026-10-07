import { AccessError } from "./security";

// Mirrors hosted numeric(14,2). Validate the decimal string before Number can
// hide extra precision; accept trailing zeroes but never silently round input.
export const BUSINESS_MAX = 999999999999.99;
export const LEAD_DAYS_MAX = 36500;
export function businessNumber(
  raw: unknown,
  label: string,
  options: {
    required?: boolean;
    integer?: boolean;
    existing?: number | null;
  } = {},
): number | null {
  if (raw === "" || raw === null || raw === undefined) {
    if (options.required)
      throw new AccessError(400, "invalid_number", "Enter " + label + ".");
    return null;
  }
  if (typeof raw !== "string" && typeof raw !== "number")
    throw new AccessError(400, "invalid_number", "Check " + label + ".");
  const text = String(raw).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text))
    throw new AccessError(
      400,
      "invalid_number",
      "Use a decimal number for " + label + ".",
    );
  const value = Number(text);
  const fraction = (text.split(".")[1] ?? "").replace(/0+$/, "");
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (options.integer
      ? text.includes(".") ||
        !Number.isSafeInteger(value) ||
        value > 2147483647 ||
        (value > LEAD_DAYS_MAX && value !== options.existing)
      : value > BUSINESS_MAX || fraction.length > 2)
  )
    throw new AccessError(
      400,
      "invalid_number",
      options.integer
        ? "Use whole lead days from 0 to 36500."
        : "Use up to two decimal places within the supported range for " +
            label +
            ".",
    );
  return value;
}
