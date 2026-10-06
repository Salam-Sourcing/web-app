import type { Workspace } from "./access";
import { activeCompany, checked, companyManager } from "./catalog";
import { AccessError } from "../security";
import type { DealBundle, ReviewState } from "../deals";
import { dealFileTypes } from "../deals";
import { storagePath } from "../catalog";
export async function dealBundle(
  state: Workspace,
  id: number,
  expected?: unknown,
): Promise<DealBundle> {
  const c = activeCompany(state, expected);
  const result = await state.client.rpc("get_deal_progress", {
    p_deal_id: id,
    p_company_id: c.id,
  });
  checked(result.error);
  if (
    !result.data ||
    typeof result.data !== "object" ||
    Array.isArray(result.data)
  )
    throw new AccessError(404, "deal_unavailable", "This deal is unavailable.");
  const bundle = result.data as unknown as DealBundle;
  const scope =
    bundle.deal?.buyer_company_id === c.id
      ? "procurement"
      : bundle.deal?.supplier_company_id === c.id
        ? "sales"
        : null;
  if (!scope)
    throw new AccessError(
      403,
      "deal_access",
      "This deal is unavailable to your selected company.",
    );
  activeCompany(state, expected, scope);
  return bundle;
}
export async function dealReviewState(
  state: Workspace,
  id: number,
): Promise<ReviewState> {
  const c = activeCompany(state);
  const result = await state.client.rpc("get_deal_review_state", {
    p_deal_id: id,
    p_company_id: c.id,
  });
  checked(result.error);
  if (!result.data)
    throw new AccessError(
      503,
      "review_unavailable",
      "Review eligibility could not be checked. Refresh to retry.",
    );
  return result.data as unknown as ReviewState;
}
export async function editableDeal(
  state: Workspace,
  id: number,
  expected?: unknown,
) {
  const bundle = await dealBundle(state, id, expected);
  if (!["agreed", "in_progress"].includes(bundle.deal.status))
    throw new AccessError(
      409,
      "deal_locked",
      "Only active deals can receive new documents. Refresh this deal.",
    );
  return bundle;
}
export async function companyReviews(state: Workspace, id: number, offset = 0) {
  const result = await state.client.rpc("get_company_reviews", {
    p_company_id: id,
    p_limit: 20,
    p_offset: offset,
  });
  checked(result.error);
  return result.data ?? [];
}
export async function reviewResponseTarget(
  state: Workspace,
  company: number,
  review: number,
) {
  const c = companyManager(state, company);
  const result = await state.client
    .from("reviews")
    .select("id,reviewed_company_id,status")
    .eq("id", review)
    .maybeSingle();
  checked(result.error);
  if (
    !result.data ||
    result.data.reviewed_company_id !== c.id ||
    result.data.status !== "published"
  )
    throw new AccessError(
      403,
      "review_access",
      "Select the reviewed company to respond to this review.",
    );
}
export async function dealDocumentUrl(
  state: Workspace,
  id: number,
  projectUrl: string,
) {
  const row = await state.client
    .from("deal_documents")
    .select("deal_id,storage_path,file_mime_type")
    .eq("id", id)
    .maybeSingle();
  checked(row.error);
  if (
    !row.data ||
    !dealFileTypes.includes(
      row.data.file_mime_type as (typeof dealFileTypes)[number],
    )
  )
    throw new AccessError(
      404,
      "file_unavailable",
      "This document is unavailable.",
    );
  await dealBundle(state, row.data.deal_id);
  const path = storagePath(row.data.storage_path, projectUrl, "deal-documents");
  if (!path)
    throw new AccessError(
      404,
      "file_unavailable",
      "This document is unavailable.",
    );
  const signed = await state.client.storage
    .from("deal-documents")
    .createSignedUrl(path, 300);
  checked(signed.error);
  if (!signed.data)
    throw new AccessError(
      503,
      "file_unavailable",
      "This document is unavailable.",
    );
  return signed.data.signedUrl;
}
