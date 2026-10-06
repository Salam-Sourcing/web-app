import { AccessError, textField } from "./security";
export const scopes = [
  "listings",
  "sales",
  "procurement",
  "insights",
  "billing",
  "team",
] as const;
export const preferences = [
  "search_alerts",
  "messages",
  "enquiries",
  "quotes",
  "deals",
  "listing_reviews",
] as const;
export const teamRoles = [
  "admin",
  "manager",
  "sales",
  "procurement",
  "member",
] as const;
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new AccessError(
      400,
      "invalid_id",
      "Enter a valid invitation or member ID.",
    );
  return value;
}
export function email(value: unknown): string {
  const v = textField({ email: value }, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    throw new AccessError(400, "invalid_email", "Enter a valid email address.");
  return v;
}
export function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AccessError(
      503,
      "invalid_response",
      "Unable to load this account information. Please retry.",
    );
  return value as Record<string, any>;
}
export function rows(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value))
    throw new AccessError(
      503,
      "invalid_response",
      "Unable to load this account information. Please retry.",
    );
  return value.map(object);
}
export function permissionOverride(
  input: Record<string, unknown>,
): string[] | null {
  if (input.mode === "role") return null;
  if (input.mode !== "custom")
    throw new AccessError(
      400,
      "invalid_input",
      "Choose role defaults or custom restrictions.",
    );
  return scopes.filter((scope) => input[scope] === "on");
}
export function ratio(numerator: unknown, denominator: unknown): string {
  return typeof numerator === "number" &&
    typeof denominator === "number" &&
    denominator > 0
    ? ((100 * numerator) / denominator).toFixed(1) + "%"
    : "Unavailable";
}
export const exportSections = [
  "memberships",
  "messages",
  "notifications",
  "support_requests",
  "owned_companies",
  "authored_listings",
  "authored_enquiries",
  "authored_quotes",
  "saved_listings",
  "saved_companies",
  "saved_enquiries",
  "uploaded_enquiry_files",
  "filed_complaints",
] as const;
export async function personalExport(
  fetchPage: (page: number) => Promise<unknown>,
  subject: string,
  maxPages = 100,
  maxBytes = 10 * 1024 * 1024,
) {
  let output: Record<string, any> | undefined,
    size = 0;
  for (let page = 0; page < maxPages; page++) {
    const part = object(await fetchPage(page));
    if (
      part.subject !== subject ||
      part.page !== page ||
      part.page_size !== 100
    )
      throw new AccessError(
        503,
        "invalid_response",
        "Export could not be verified.",
      );
    for (const section of exportSections) rows(part[section]);
    size += new TextEncoder().encode(JSON.stringify(part)).length;
    if (size > maxBytes) break;
    if (!output) output = part;
    else
      for (const section of exportSections)
        output[section].push(...part[section]);
    if (exportSections.every((section) => part[section].length < 100))
      return output;
  }
  throw new AccessError(
    413,
    "export_limit",
    "Your export exceeds the website download limit. Contact support for a complete export.",
  );
}
