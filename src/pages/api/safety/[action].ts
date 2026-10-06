import type { APIRoute } from "astro";
import { requireWorkspace } from "../../../lib/server/access";
import {
  readMutation,
  positiveId,
  textField,
  AccessError,
  json,
  errorResponse,
} from "../../../lib/security";
export const POST: APIRoute = async (context) => {
  try {
    const input = await readMutation(context.request);
    const state = await requireWorkspace(context);
    const action = context.params.action;
    const checked = (error: { message: string } | null) => {
      if (error) throw new AccessError(400, "safety_failed", error.message);
    };
    if (action === "delete") {
      if (input.confirm !== "DELETE")
        throw new AccessError(
          400,
          "confirmation_required",
          "Type DELETE to confirm.",
        );
      checked((await state.client.rpc("request_account_deletion")).error);
      return json({ redirect: "/account/safety" });
    }
    if (action === "cancel-deletion") {
      const request = await state.client
        .from("account_deletion_requests")
        .select("status")
        .eq("user_id", state.user.id)
        .maybeSingle();
      if (request.error || request.data?.status !== "pending")
        throw new AccessError(
          409,
          "cannot_cancel",
          "Deletion cannot be cancelled in its current state. Refresh to check its status.",
        );
      checked((await state.client.rpc("cancel_account_deletion")).error);
      return json({ redirect: "/account/safety" });
    }
    if (action === "block" || action === "unblock") {
      if (
        !state.safetyCompany ||
        state.company?.id !== state.safetyCompany.id ||
        positiveId(input.company_id) !== state.safetyCompany.id
      )
        throw new AccessError(
          409,
          "company_scope",
          "Select your default company before managing company blocking.",
        );
      if (input.confirm !== "CONFIRM")
        throw new AccessError(
          400,
          "confirmation_required",
          "Confirm this change first.",
        );
      checked(
        (
          await state.client.rpc(
            action === "block" ? "block_company" : "unblock_company",
            { p_company_id: positiveId(input.target_id) },
          )
        ).error,
      );
      return json({ redirect: "/account/safety", contextChanged: true });
    }
    if (action === "report") {
      const type = textField(input, "target_type", 10);
      const id = positiveId(input.target_id);
      const reason = textField(input, "reason", 20);
      if (
        ![
          "spam_scam",
          "misleading",
          "harassment",
          "prohibited",
          "impersonation",
          "other",
        ].includes(reason)
      )
        throw new AccessError(400, "invalid_reason", "Choose a report reason.");
      const description = textField(input, "description", 4000, 5);
      if (type === "review")
        checked(
          (
            await state.client.rpc("report_company_review", {
              p_review_id: id,
              p_reason: reason,
              p_description: description,
            })
          ).error,
        );
      else {
        if (!["company", "listing", "message"].includes(type))
          throw new AccessError(
            400,
            "invalid_target",
            "Choose a report target.",
          );
        checked(
          (
            await state.client.rpc("file_complaint", {
              p_complaint_type: reason,
              p_description: description,
              p_target_company_id: type === "company" ? id : undefined,
              p_target_listing_id: type === "listing" ? id : undefined,
              p_target_message_id: type === "message" ? id : undefined,
            })
          ).error,
        );
      }
      return json({ message: "Your report was submitted for review." });
    }
    throw new AccessError(
      404,
      "not_found",
      "This safety action is unavailable.",
    );
  } catch (error) {
    return errorResponse(error);
  }
};
