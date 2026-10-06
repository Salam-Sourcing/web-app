import type { Database } from "./database.types";
import { AccessError } from "./security";
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type DealEvent =
  Database["public"]["Tables"]["deal_progress_events"]["Row"];
export type DealBundle = {
  deal: Deal;
  buyer: string;
  supplier: string;
  progress: {
    stage: string;
    expected_delivery?: string | null;
    tracking_reference?: string | null;
    updated_at?: string;
  };
  events: DealEvent[];
  documents: { id: number; file_name: string; storage_path: string }[];
};
export type ReviewState = {
  reviewed_company_id: number;
  reviewed_company_name: string;
  product_name: string;
  own_confirmed: boolean;
  other_confirmed: boolean;
  can_confirm: boolean;
  can_review: boolean;
  review_id: number | null;
  deal_status: string;
};
export type CompanyReview =
  Database["public"]["Functions"]["get_company_reviews"]["Returns"][number];
export const stages = ["agreed", "preparing", "shipped", "received"] as const;
export function nextMilestone(
  d: Deal,
  stage: string,
  company: number,
): string | null {
  if (!["agreed", "in_progress"].includes(d.status)) return null;
  if (company === d.supplier_company_id)
    return stage === "agreed"
      ? "preparing"
      : stage === "preparing"
        ? "shipped"
        : null;
  return company === d.buyer_company_id && stage === "shipped"
    ? "received"
    : null;
}
export function calendarDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new AccessError(400, "invalid_date", "Choose a valid delivery date.");
  return value;
}
export function reviewRating(value: unknown): number {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new AccessError(
      400,
      "invalid_rating",
      "Choose a rating from 1 to 5.",
    );
  return rating;
}
export const dealFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export function messageImage(
  mime: string | null | undefined,
  name?: string | null,
): boolean {
  return mime
    ? ["image/jpeg", "image/png", "image/webp"].includes(mime.toLowerCase())
    : /\.(jpe?g|png|webp)$/i.test(name ?? "");
}
