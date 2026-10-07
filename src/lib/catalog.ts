import { uploadSizeLimit } from "./upload-limits";
import { AccessError, positiveId, textField } from "./security";
import { businessNumber } from "./business-numbers";
import type { Database, Json } from "./database.types";
import {
  companyLimits,
  preservedText,
  unchangedText,
} from "./client-contracts";
export const PAGE_SIZE = 24;
export const listingStatuses = [
  "draft",
  "pending_review",
  "published",
  "paused",
  "rejected",
  "archived",
] as const;
export const documentTypes = [
  "business_registration",
  "tax_document",
  "proof_of_address",
  "other",
] as const;
export const managerRoles = [
  "owner",
  "admin",
  "manager",
  "sales",
  "procurement",
];
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type ListingCardData = {
  id: number;
  company_id: number;
  name: string;
  vendor_name: string;
  category: string;
  location: string;
  minimum_order_quantity: number | null;
  unit_of_measure: string;
  price_per_unit: number | null;
  currency: string;
  estimated_lead_time_days: number | null;
  is_verified: boolean;
  saved: boolean;
  has_image: boolean;
};
export type Taxonomy = {
  id: number;
  name: string;
  sub_categories: { id: number; name: string }[];
};
export function optional(
  data: Record<string, unknown>,
  key: string,
  max = 200,
): string | null {
  if (data[key] === undefined || data[key] === null || data[key] === "")
    return null;
  return textField(data, key, max, 0) || null;
}
export function numberValue(
  value: unknown,
  label: string,
  integer = false,
): number | null {
  return businessNumber(value, label, { integer });
}
export function website(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 500)
    throw new AccessError(400, "invalid_website", "Enter a valid website.");
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : "https://" + value);
  } catch {
    throw new AccessError(400, "invalid_website", "Enter a valid website.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname.includes(".")
  )
    throw new AccessError(
      400,
      "invalid_website",
      "Enter an HTTP or HTTPS website.",
    );
  return url.href;
}
export function companyPayload(
  data: Record<string, unknown>,
  existing?: Record<string, unknown>,
) {
  const type = textField(data, "company_type", 30);
  if (!["buyer", "supplier", "buyer_supplier"].includes(type))
    throw new AccessError(
      400,
      "invalid_type",
      "Choose buyer, supplier, or both.",
    );
  const field = (key: keyof typeof companyLimits, required = false) =>
    preservedText(
      { ...data, [key]: data[key] ?? "" },
      key,
      companyLimits[key],
      existing?.[key],
      required ? 1 : 0,
    );
  const email = field("email", !existing);
  if (
    (!existing || email) &&
    !unchangedText(email, existing?.email) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new AccessError(
      400,
      "invalid_email",
      "Enter a valid business email.",
    );
  return {
    legal_name: field("legal_name", true),
    display_name: field("display_name", true),
    company_type: type,
    country: field("country", true),
    description: field("description") || null,
    business_registration_number: field("business_registration_number") || null,
    tax_number: field("tax_number") || null,
    province_state: field("province_state") || null,
    city: field("city") || null,
    address: field("address") || null,
    postal_code: field("postal_code") || null,
    contact_number: field("contact_number") || null,
    email:
      (unchangedText(email, existing?.email) ? email : email.toLowerCase()) ||
      null,
    website: unchangedText(data.website, existing?.website)
      ? (existing!.website as string)
      : website(data.website),
  };
}
export function listingPayload(
  data: Record<string, unknown>,
  existing?: Record<string, any>,
) {
  const type = textField(data, "listing_type", 10);
  if (!["product", "service"].includes(type))
    throw new AccessError(400, "invalid_type", "Choose product or service.");
  let specs: unknown = data.specifications ?? {};
  if (typeof specs === "string") {
    try {
      specs = JSON.parse(specs);
    } catch {
      throw new AccessError(400, "invalid_specs", "Check your specifications.");
    }
  }
  if (
    !specs ||
    typeof specs !== "object" ||
    Array.isArray(specs) ||
    Object.keys(specs).length > 30
  )
    throw new AccessError(
      400,
      "invalid_specs",
      "Use up to 30 specification pairs.",
    );
  const specifications: Record<string, Json> = Object.create(null);
  for (const [key, value] of Object.entries(specs)) {
    if (
      !key.trim() ||
      key.length > 100 ||
      typeof value !== "string" ||
      value.length > 500 ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      throw new AccessError(
        400,
        "invalid_specs",
        "Use valid specification names and values.",
      );
    specifications[key.trim()] = value.trim();
  }
  return {
    listing_type: type,
    name: textField(data, "name", 200),
    description: textField(data, "description", 6000),
    sub_category_id: positiveId(data.sub_category_id),
    specifications,
    price_per_unit: numberValue(data.price_per_unit, "price"),
    unit_of_measure: textField(data, "unit_of_measure", 60),
    minimum_order_quantity: numberValue(data.minimum_order_quantity, "MOQ"),
    estimated_lead_time_days: businessNumber(
      data.estimated_lead_time_days,
      "lead time",
      { integer: true, existing: existing?.estimated_lead_time_days },
    ),
    origin_country: optional(data, "origin_country", 100),
  };
}
export function searchInput(params: URLSearchParams) {
  const string = (key: string, max: number) => {
    const value = params.get(key) ?? "";
    if (value.length > max)
      throw new AccessError(
        400,
        "invalid_filter",
        "Search filter is too long.",
      );
    return value.trim();
  };
  const min = numberValue(params.get("min_price"), "minimum price"),
    max = numberValue(params.get("max_price"), "maximum price");
  if (min !== null && max !== null && min > max)
    throw new AccessError(
      400,
      "invalid_filter",
      "Minimum price must not exceed maximum price.",
    );
  const sort = string("sort", 20) || "newest";
  if (!["newest", "price_low", "price_high", "lead_time"].includes(sort))
    throw new AccessError(400, "invalid_filter", "Choose a valid sort.");
  const currency = string("currency", 3).toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency))
    throw new AccessError(
      400,
      "invalid_filter",
      "Choose a three-letter currency.",
    );
  const offset = numberValue(params.get("offset"), "page", true) ?? 0;
  if (offset > 10000)
    throw new AccessError(
      400,
      "invalid_page",
      "Page is outside the supported range.",
    );
  const company = params.get("company_id");
  return {
    offset,
    filters: {
      query: string("query", 200),
      category: string("category", 200),
      location: string("location", 200),
      currency,
      min_price: min,
      max_price: max,
      max_moq: numberValue(params.get("max_moq"), "maximum MOQ"),
      max_lead_days: numberValue(
        params.get("max_lead_days"),
        "maximum lead time",
        true,
      ),
      verified: params.get("verified") === "true",
      saved: params.get("saved") === "true",
      sort,
      ...(company ? { company_id: positiveId(company) } : {}),
    },
  };
}
export function storagePath(
  value: string,
  projectUrl: string,
  bucket: string,
): string | null {
  let path = value;
  if (value.includes("://")) {
    try {
      const u = new URL(value),
        project = new URL(projectUrl);
      const prefix = "/storage/v1/object/";
      if (
        u.protocol !== "https:" ||
        u.origin !== project.origin ||
        !u.pathname.startsWith(prefix)
      )
        return null;
      const parts = u.pathname.slice(prefix.length).split("/");
      if (
        !["public", "sign", "authenticated"].includes(parts[0]) ||
        parts[1] !== bucket
      )
        return null;
      path = decodeURIComponent(parts.slice(2).join("/"));
    } catch {
      return null;
    }
  }
  if (
    !path ||
    path.length > 1024 ||
    path.startsWith("/") ||
    /[\\?#\x00-\x20]/.test(path) ||
    path.split("/").some((x) => !x || x === "." || x === "..")
  )
    return null;
  return path;
}
export const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export function validateFile(
  bytes: Uint8Array,
  mime: string,
  kind:
    | "listing"
    | "document"
    | "enquiry"
    | "message"
    | "deal"
    | "company"
    | "profile",
) {
  const max = ["listing", "company", "profile"].includes(kind)
    ? 5 * 1024 * 1024
    : uploadSizeLimit(mime);
  if (bytes.length === 0 || bytes.length > max)
    throw new AccessError(
      400,
      "file_size",
      mime === "application/pdf" && max > 5 * 1024 * 1024
        ? "Choose a PDF up to 10 MB."
        : "Choose a photo up to 5 MB.",
    );
  const prefix = Array.from(bytes.subarray(0, 12));
  const matches =
    mime === "image/jpeg"
      ? prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255
      : mime === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => prefix[i] === n)
        : mime === "image/webp" && kind !== "deal"
          ? String.fromCharCode(...prefix.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...prefix.slice(8, 12)) === "WEBP"
          : mime === "application/pdf" &&
              !["listing", "company", "profile"].includes(kind)
            ? String.fromCharCode(...prefix.slice(0, 5)) === "%PDF-"
            : false;
  if (!matches)
    throw new AccessError(
      400,
      "file_type",
      "Choose a valid JPEG, PNG, WebP" +
        (!["listing", "company", "profile"].includes(kind) ? " or PDF" : "") +
        " file.",
    );
}
export function allowedTransition(status: string, action: string): boolean {
  return action === "submit"
    ? ["draft", "rejected"].includes(status)
    : action === "pause"
      ? status === "published"
      : action === "resume"
        ? status === "paused"
        : action === "archive" && status !== "archived";
}
export function uniquePage<T extends { id: number }>(current: T[], next: T[]) {
  const seen = new Set(current.map((r) => r.id));
  return [
    ...current,
    ...next.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    }),
  ];
}

export function categoryIcon(category: string): string {
  const name = category.toLowerCase();
  if (!name || name === "all categories") return "grid";
  for (const [words, icon] of [
    [["grain", "puls", "agric"], "plant"],
    [["food", "beverage"], "food"],
    [["steel", "metal"], "layers"],
    [["wood", "timber"], "tree"],
    [["build", "construct"], "building"],
    [["electric", "electronic"], "chip"],
    [["chemical"], "flask"],
    [["machine", "industrial"], "machine"],
    [["tool", "component"], "tool"],
    [["packag", "paper"], "box"],
    [["textile", "apparel"], "hanger"],
    [["plastic", "polymer"], "recycle"],
    [["fixture", "hardware"], "tool"],
    [["logistic", "transport"], "truck"],
    [["service"], "briefcase"],
  ] as [string[], string][]) {
    if (words.some((word) => name.includes(word))) return icon;
  }
  return "grid";
}
