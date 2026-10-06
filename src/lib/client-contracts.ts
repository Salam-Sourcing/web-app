import { AccessError, textField } from "./security";

export const MESSAGE_LIMIT = 8000;
export const REPORT_LIMIT = 1000;
export const reportReasons = [
  ["spam_scam", "Spam or scam"],
  ["misleading", "Misleading information"],
  ["harassment", "Harassment"],
  ["prohibited", "Prohibited product or content"],
  ["impersonation", "Impersonation"],
  ["other", "Other"],
] as const;
export const companyLimits = {
  legal_name: 200,
  display_name: 200,
  description: 4000,
  business_registration_number: 200,
  tax_number: 200,
  country: 100,
  province_state: 100,
  city: 100,
  address: 500,
  postal_code: 30,
  contact_number: 50,
  email: 254,
  website: 500,
} as const;

// Only a value read from the authorized record can grandfather an older field.
// Preserve it exactly, rather than truncating or normalizing unrelated data.
export function unchangedText(value: unknown, existing: unknown): boolean {
  return (
    typeof value === "string" &&
    typeof existing === "string" &&
    value.trim() === existing.trim()
  );
}
export function preservedText(
  data: Record<string, unknown>,
  key: string,
  max: number,
  existing?: unknown,
  min = 1,
): string {
  if (
    unchangedText(data[key], existing) &&
    (existing as string).trim().length >= min
  )
    return existing as string;
  return textField(data, key, max, min);
}
export function fieldMaximum(max: number, existing: unknown): number {
  return Math.max(max, typeof existing === "string" ? existing.length : 0);
}
export function reportPayload(input: Record<string, unknown>) {
  const reason = textField(input, "reason", 20);
  if (!reportReasons.some(([value]) => value === reason))
    throw new AccessError(400, "invalid_reason", "Choose a report reason.");
  return {
    reason,
    description: textField(input, "description", REPORT_LIMIT, 5),
  };
}
