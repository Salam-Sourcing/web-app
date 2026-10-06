import type { Workspace } from "./access";
import { AccessError, positiveId } from "../security";
import {
  PAGE_SIZE,
  managerRoles,
  searchInput,
  type ListingCardData,
  type Taxonomy,
} from "../catalog";
export function checked(
  error: { code?: string; message: string } | null,
): void {
  if (!error) return;
  const publicMessage = ["P0001", "22023", "23514", "PT429"].includes(
    error.code ?? "",
  )
    ? error.message.slice(0, 400)
    : error.code === "23505"
      ? "This record already exists. Refresh before trying again."
      : error.code === "42501"
        ? "You no longer have access to this action. Refresh your account."
        : "Unable to load or save this record. Please retry.";
  throw new AccessError(
    error.code === "PT429"
      ? 429
      : error.code === "42501"
        ? 403
        : error.code === "23505"
          ? 409
          : ["P0001", "22023", "23514"].includes(error.code ?? "")
            ? 400
            : 503,
    "catalog_failed",
    publicMessage,
  );
}
export function activeCompany(
  state: Workspace,
  expected?: unknown,
  scope?: string,
) {
  const company = state.company;
  if (!company)
    throw new AccessError(
      403,
      "company_required",
      "Create or select a company first.",
    );
  if (expected !== undefined && positiveId(expected) !== company.id)
    throw new AccessError(
      409,
      "company_changed",
      "Your company changed. Reload before making changes.",
    );
  if (scope && !state.permissions.includes(scope))
    throw new AccessError(
      403,
      "permission_required",
      "Your company role does not permit this action.",
    );
  return company;
}
export function companyManager(state: Workspace, expected?: unknown) {
  const company = activeCompany(state, expected);
  if (!managerRoles.includes(company.role))
    throw new AccessError(
      403,
      "permission_required",
      "Your company role cannot manage this profile.",
    );
  return company;
}
export async function taxonomy(state: Workspace): Promise<Taxonomy[]> {
  const result = await state.client
    .from("categories")
    .select("id,name,sub_categories(id,name,active)")
    .eq("active", true)
    .order("name");
  checked(result.error);
  return (result.data ?? []).map((row) => ({
    ...row,
    sub_categories: row.sub_categories
      .filter((child) => child.active)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
export async function search(state: Workspace, params: URLSearchParams) {
  const input = searchInput(params);
  const result = await state.client.rpc("search_marketplace", {
    p_filters: input.filters,
    p_offset: input.offset,
    p_limit: PAGE_SIZE,
  });
  checked(result.error);
  const ids = (result.data ?? []).map((row) => row.id);
  let savedIds = new Set<number>();
  if (ids.length) {
    const saved = await state.client
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", state.user.id)
      .in("listing_id", ids);
    checked(saved.error);
    savedIds = new Set(saved.data?.map((r) => r.listing_id));
  }
  const rows: ListingCardData[] = (result.data ?? []).map((row) => ({
    ...row,
    name: row.name ?? "",
    category: row.category ?? "",
    vendor_name: row.vendor_name ?? "Supplier",
    location: row.location ?? "",
    unit_of_measure: row.unit_of_measure ?? "units",
    currency: row.currency ?? "CAD",
    has_image: Boolean(row.image_url),
    saved: savedIds.has(row.id),
  }));
  // Stored paths and tokens are never part of the browser feed.
  return {
    rows: rows.map(
      ({
        id,
        company_id,
        name,
        category,
        vendor_name,
        location,
        unit_of_measure,
        currency,
        has_image,
        saved,
        minimum_order_quantity,
        price_per_unit,
        estimated_lead_time_days,
        is_verified,
      }) => ({
        id,
        company_id,
        name,
        category,
        vendor_name,
        location,
        unit_of_measure,
        currency,
        has_image,
        saved,
        minimum_order_quantity,
        price_per_unit,
        estimated_lead_time_days,
        is_verified,
      }),
    ),
    offset: input.offset,
    nextOffset: input.offset + (result.data?.length ?? 0),
    hasMore: result.data?.length === PAGE_SIZE,
  };
}
export async function publicCompany(state: Workspace, id: number) {
  const result = await state.client.rpc("get_public_company_profile", {
    p_company_id: id,
  });
  checked(result.error);
  const row = result.data?.[0];
  if (!row)
    throw new AccessError(
      404,
      "record_unavailable",
      "This supplier is unavailable.",
    );
  return row;
}
export async function publicListing(state: Workspace, id: number) {
  const result = await state.client
    .from("listings")
    .select(
      "*,sub_categories(name,categories(name)),listing_images(id,is_primary,display_order)",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  checked(result.error);
  if (!result.data)
    throw new AccessError(
      404,
      "record_unavailable",
      "This listing is unavailable.",
    );
  const company = await publicCompany(state, result.data.company_id);
  if (company.verification_status !== "verified")
    throw new AccessError(
      404,
      "record_unavailable",
      "This listing is unavailable.",
    );
  return { listing: result.data, company };
}
export async function sellerListing(
  state: Workspace,
  id: number,
  expected?: unknown,
) {
  const company = activeCompany(state, expected, "listings");
  const result = await state.client
    .from("listings")
    .select("*,listing_images(id,is_primary,display_order)")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  checked(result.error);
  if (!result.data)
    throw new AccessError(
      404,
      "record_unavailable",
      "This listing is unavailable in your company.",
    );
  return result.data;
}
export async function editableVerification(
  state: Workspace,
  id: number,
  expected?: unknown,
) {
  const company = companyManager(state, expected);
  const result = await state.client
    .from("company_verifications")
    .select("id,status,company_id")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  checked(result.error);
  if (!result.data || !["draft", "rejected"].includes(result.data.status))
    throw new AccessError(
      409,
      "verification_locked",
      "This verification is no longer editable.",
    );
  return result.data;
}
export async function savedSuppliers(state: Workspace, offset = 0) {
  const saved = await state.client
    .from("saved_companies")
    .select("company_id")
    .eq("user_id", state.user.id)
    .order("id")
    .range(offset, offset + PAGE_SIZE - 1);
  checked(saved.error);
  const rows = await Promise.all(
    (saved.data ?? []).map(async (item) => {
      const result = await state.client.rpc("get_public_company_profile", {
        p_company_id: item.company_id,
      });
      checked(result.error);
      return { id: item.company_id, profile: result.data?.[0] ?? null };
    }),
  );
  return {
    rows,
    nextOffset: offset + rows.length,
    hasMore: rows.length === PAGE_SIZE,
  };
}
export function contactAllowed(state: Workspace, supplier: number) {
  return Boolean(
    state.company &&
    state.company.id !== supplier &&
    state.company.verification_status === "verified" &&
    state.permissions.includes("procurement"),
  );
}
