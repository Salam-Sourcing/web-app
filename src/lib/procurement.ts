import { AccessError, positiveId, textField } from "./security";
import { businessNumber } from "./business-numbers";
import { createRequestId } from "./request-id";
import type { Row } from "./catalog";
export type Enquiry = Row<"enquiries">;
export type Quote = Row<"quotes">;
export const openEnquiry = (row: Enquiry) =>
  ["open", "quoted", "negotiating"].includes(row.status);
export const expired = (value: string | null, now = Date.now()) =>
  value !== null && Date.parse(value) <= now;
export function numberField(
  input: Record<string, unknown>,
  key: string,
  required = false,
  integer = false,
): number | null {
  return businessNumber(input[key], key.replaceAll("_", " "), {
    required,
    integer,
  });
}
export function futureDate(
  value: unknown,
  required = false,
  now = Date.now(),
): string | null {
  if (!value && !required) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      value,
    )
  )
    throw new AccessError(400, "invalid_date", "Choose a valid date.");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  )
    throw new AccessError(400, "invalid_date", "Choose a valid calendar date.");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now)
    throw new AccessError(400, "invalid_date", "Choose a future date.");
  return date.toISOString();
}
const optionalText = (d: Record<string, unknown>, key: string, max: number) =>
  textField({ ...d, [key]: d[key] ?? "" }, key, max, 0) || null;
export function enquiryPayload(input: Record<string, unknown>, buyer: number) {
  const type =
    input.enquiry_type === "direct"
      ? "direct"
      : input.enquiry_type === "public_rfq"
        ? "public_rfq"
        : null;
  if (!type)
    throw new AccessError(400, "invalid_type", "Choose an enquiry type.");
  const currency = textField(input, "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    throw new AccessError(
      400,
      "invalid_currency",
      "Choose a three-letter currency.",
    );
  const quantity = numberField(input, "quantity");
  if (quantity !== null && quantity <= 0)
    throw new AccessError(
      400,
      "invalid_quantity",
      "Quantity must be greater than zero.",
    );
  const supplier =
    type === "direct" ? positiveId(input.supplier_company_id) : null;
  if (supplier === buyer)
    throw new AccessError(
      400,
      "invalid_supplier",
      "Choose a different supplier.",
    );
  return {
    buyer_company_id: buyer,
    enquiry_type: type,
    supplier_company_id: supplier,
    listing_id:
      type === "direct" && input.listing_id
        ? positiveId(input.listing_id)
        : null,
    title: textField(input, "title", 180),
    message: textField(input, "message", 8000),
    sub_category_id: input.sub_category_id
      ? positiveId(input.sub_category_id)
      : null,
    visibility: input.visibility === "invited" ? "invited" : "public",
    urgency: input.urgency === "urgent" ? "urgent" : "normal",
    quantity,
    unit_of_measure: optionalText(input, "unit_of_measure", 50),
    delivery_city: optionalText(input, "delivery_city", 100),
    delivery_province_state: optionalText(
      input,
      "delivery_province_state",
      100,
    ),
    delivery_country: optionalText(input, "delivery_country", 100) ?? "Canada",
    currency,
    quote_deadline: futureDate(input.quote_deadline, type === "public_rfq"),
  };
}
export function quotePayload(
  input: Record<string, unknown>,
  supplier: number,
  enquiry: Enquiry,
) {
  const currency = textField(input, "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    throw new AccessError(
      400,
      "invalid_currency",
      "Choose a three-letter currency.",
    );
  const total = numberField(input, "total_price", true);
  if (!total || total <= 0)
    throw new AccessError(
      400,
      "invalid_price",
      "Total price must be greater than zero.",
    );
  return {
    enquiry_id: enquiry.id,
    supplier_company_id: supplier,
    currency,
    total_price: total,
    price_per_unit: numberField(input, "price_per_unit"),
    lead_time_days: numberField(input, "lead_time_days", false, true),
    valid_until: futureDate(input.valid_until, true),
    notes: optionalText(input, "notes", 5000),
    payment_terms: optionalText(input, "payment_terms", 1000),
    shipping_terms: optionalText(input, "shipping_terms", 1000),
  };
}
export function quoteOrder<T extends Quote>(quotes: T[], order: string): T[] {
  return [...quotes].sort((a, b) => {
    if (order === "price")
      return (
        a.currency.localeCompare(b.currency) ||
        (a.total_price ?? Infinity) - (b.total_price ?? Infinity) ||
        b.id - a.id
      );
    if (order === "lead")
      return (
        (a.lead_time_days ?? Infinity) - (b.lead_time_days ?? Infinity) ||
        b.id - a.id
      );
    return Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id;
  });
}
export function historyCursor(params: URLSearchParams) {
  const before = params.get("before"),
    id = params.get("before_id");
  if (!before && !id) return null;
  if (
    !before ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      before,
    ) ||
    !Number.isFinite(Date.parse(before))
  )
    throw new AccessError(400, "invalid_cursor", "Reload this conversation.");
  return { sent_at: before, id: positiveId(id) };
}
export function requestId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new AccessError(
      400,
      "invalid_request_id",
      "Prepare this message again.",
    );
  return value;
}
export const money = (value: number | null, currency: string) =>
  value === null
    ? "Not specified"
    : currency +
      " " +
      new Intl.NumberFormat("en-CA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
export const location = (e: Enquiry) =>
  [e.delivery_city, e.delivery_province_state, e.delivery_country]
    .filter(Boolean)
    .join(", ") || "Not specified";
export const dateLabel = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-CA", {
        timeZone: "America/Edmonton",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " MT"
    : "Not specified";

export type ThreadMessage = {
  id: number;
  client_message_id?: string | null;
  sent_at: string;
  content: string | null;
  is_deleted: boolean;
  outgoing: boolean;
  seen: boolean;
  attachments: {
    id: number;
    file_name: string;
    file_mime_type: string | null;
    file_size_bytes: number | null;
  }[];
};
export function mergeMessages(
  current: ThreadMessage[],
  incoming: ThreadMessage[],
) {
  const map = new Map(current.map((x) => [x.id, x]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) =>
      Date.parse(a.sent_at) - Date.parse(b.sent_at) ||
      (a.sent_at.match(/\.(\d+)/)?.[1] ?? "")
        .padEnd(6, "0")
        .localeCompare(
          (b.sent_at.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0"),
        ) ||
      a.id - b.id,
  );
}
export function pendingText(content: string) {
  const text = content.trim();
  if (!text) throw new Error("Write a message before sending.");
  return { content: text, client_message_id: createRequestId() };
}

export const quantityLabel = (e: Enquiry) =>
  (e.quantity ?? "Not specified") +
  (e.unit_of_measure ? " " + e.unit_of_measure : "");
