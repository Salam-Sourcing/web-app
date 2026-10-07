// Include UTF-8, JSON escapes and the listing form's encoded specifications.
export function catalogRequestLimit(action?: string) {
  if (action === "company-update") return 1024 * 1024;
  if (["listing-create", "listing-update"].includes(action ?? ""))
    return 256 * 1024;
  if (action === "company-create") return 128 * 1024;
  return 16384;
}
export function procurementRequestLimit(action?: string) {
  if (["save-enquiry", "quote"].includes(action ?? "")) return 128 * 1024;
  return action === "send" ? 65536 : 16384;
}
