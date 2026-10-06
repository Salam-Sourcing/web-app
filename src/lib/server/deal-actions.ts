import type { APIContext } from "astro";
import { requireWorkspace } from "./access";
import { activeCompany, checked } from "./catalog";
import { dealBundle, dealReviewState, reviewResponseTarget } from "./deals";
import { AccessError, positiveId, textField, json } from "../security";
import { nextMilestone, calendarDate, reviewRating } from "../deals";
export async function dealAction(
  context: APIContext,
  input: Record<string, unknown>,
  action?: string,
) {
  const state = await requireWorkspace(context);
  if (action === "report") {
    const company = positiveId(input.reviewed_company_id);
    checked(
      (
        await state.client.rpc("report_company_review", {
          p_review_id: positiveId(input.review_id),
          p_reason: textField(input, "reason", 100),
          p_description: textField(input, "description", 2000),
        })
      ).error,
    );
    return json({
      redirect: "/app/suppliers/" + company + "/reviews",
      message: "Review reported.",
    });
  }
  const c = activeCompany(state, input.company_id);
  if (action === "respond") {
    const review = positiveId(input.review_id);
    await reviewResponseTarget(state, c.id, review);
    checked(
      (
        await state.client.rpc("respond_company_review", {
          p_review_id: review,
          p_response_text: textField(input, "response", 2000),
        })
      ).error,
    );
    return json({
      redirect: "/app/suppliers/" + c.id + "/reviews",
      message: "Response saved.",
    });
  }
  if (!["advance", "complete", "review"].includes(action ?? ""))
    throw new AccessError(404, "not_found", "This action is unavailable.");
  const id = positiveId(input.deal_id),
    bundle = await dealBundle(state, id, input.company_id);
  if (action === "advance") {
    const stage = textField(input, "stage", 20);
    if (nextMilestone(bundle.deal, bundle.progress.stage, c.id) !== stage)
      throw new AccessError(
        409,
        "stale_deal",
        "Refresh the deal and choose your next milestone.",
      );
    if (input.confirm !== "CONFIRM")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm this milestone before saving.",
      );
    checked(
      (
        await state.client.rpc("advance_deal_progress", {
          p_deal_id: id,
          p_company_id: c.id,
          p_stage: stage,
          p_note: textField(
            { ...input, note: input.note ?? "" },
            "note",
            1000,
            0,
          ),
          p_expected_delivery: calendarDate(input.delivery),
          p_tracking_reference:
            textField(
              { ...input, tracking: input.tracking ?? "" },
              "tracking",
              200,
              0,
            ) || undefined,
        })
      ).error,
    );
  } else {
    const eligibility = await dealReviewState(state, id);
    if (action === "complete") {
      if (!eligibility.can_confirm)
        throw new AccessError(
          409,
          "completion_unavailable",
          "Completion is already confirmed or unavailable. Refresh this deal.",
        );
      if (input.confirm !== "CONFIRM")
        throw new AccessError(
          400,
          "confirmation_required",
          "Confirm your company has fulfilled its obligations.",
        );
      checked(
        (
          await state.client.rpc("confirm_deal_completion", {
            p_deal_id: id,
            p_company_id: c.id,
          })
        ).error,
      );
    } else {
      if (!eligibility.can_review)
        throw new AccessError(
          409,
          "review_unavailable",
          "Both companies must confirm completion, and each company can review this deal once.",
        );
      checked(
        (
          await state.client.rpc("submit_company_review", {
            p_deal_id: id,
            p_company_id: c.id,
            p_rating: reviewRating(input.rating),
            p_review_text: textField(input, "review", 2000),
          })
        ).error,
      );
    }
  }
  return json({ redirect: "/app/deals/" + id, message: "Deal updated." });
}
