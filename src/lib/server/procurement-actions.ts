import type { APIContext } from "astro";
import { requireWorkspace } from "./access";
import {
  checked,
  publicCompany,
  publicListing,
  activeCompany,
} from "./catalog";
import {
  enquiry,
  buyer,
  quoteTarget,
  verifiedCompany,
  conversation,
  sendText,
} from "./procurement";
import {
  enquiryPayload,
  quotePayload,
  expired,
  openEnquiry,
  requestId,
} from "../procurement";
import { AccessError, positiveId, textField, json } from "../security";
export async function procurementAction(
  context: APIContext,
  input: Record<string, unknown>,
  action: string | undefined,
) {
  const state = await requireWorkspace(context);
  if (action === "save-enquiry") {
    const c = verifiedCompany(state, input.company_id, "procurement");
    const payload = enquiryPayload(input, c.id);
    if (payload.sub_category_id) {
      const cat = await state.client
        .from("sub_categories")
        .select("id")
        .eq("id", payload.sub_category_id)
        .eq("active", true)
        .maybeSingle();
      checked(cat.error);
      if (!cat.data)
        throw new AccessError(
          400,
          "invalid_category",
          "Choose an active category.",
        );
    }
    if (payload.supplier_company_id) {
      const s = await publicCompany(state, payload.supplier_company_id);
      if (s.verification_status !== "verified")
        throw new AccessError(
          403,
          "supplier_unavailable",
          "Choose a verified supplier.",
        );
      if (
        payload.listing_id &&
        (await publicListing(state, payload.listing_id)).company.id !== s.id
      )
        throw new AccessError(
          400,
          "invalid_listing",
          "Choose a listing from this supplier.",
        );
    }
    let id: number;
    if (input.enquiry_id) {
      id = positiveId(input.enquiry_id);
      const e = await enquiry(state, id);
      buyer(state, e, input.company_id);
      if (
        e.enquiry_type !== "public_rfq" ||
        !["draft", "rejected"].includes(e.publication_status) ||
        !openEnquiry(e)
      )
        throw new AccessError(
          409,
          "draft_locked",
          "This enquiry is no longer editable.",
        );
      if (payload.currency !== e.currency)
        throw new AccessError(
          409,
          "currency_locked",
          "Currency is fixed after creation.",
        );
      checked(
        (
          await state.client.rpc("update_enquiry_draft", {
            p_enquiry_id: id,
            p_changes: payload,
          })
        ).error,
      );
    } else {
      const r = await state.client.rpc("create_enquiry", {
        p_enquiry: payload,
      });
      checked(r.error);
      if (!r.data)
        throw new AccessError(
          503,
          "create_unconfirmed",
          "Creation could not be confirmed. Check My Enquiries.",
        );
      id = r.data;
    }
    return json({
      id,
      redirect: "/enquiries/" + id,
      message:
        payload.enquiry_type === "direct" ? "Enquiry sent." : "Draft saved.",
    });
  }
  if (action === "saved") {
    const id = positiveId(input.enquiry_id);
    if (input.saved !== "true" && input.saved !== "false")
      throw new AccessError(400, "invalid_input", "Choose a save action.");
    if (input.saved === "true") {
      await enquiry(state, id);
      checked(
        (
          await state.client
            .from("saved_enquiries")
            .upsert(
              { enquiry_id: id, user_id: state.user.id },
              { onConflict: "user_id,enquiry_id", ignoreDuplicates: true },
            )
        ).error,
      );
    } else
      checked(
        (
          await state.client
            .from("saved_enquiries")
            .delete()
            .eq("enquiry_id", id)
            .eq("user_id", state.user.id)
        ).error,
      );
    return json({ redirect: "/enquiries/" + id });
  }
  if (["review", "invite", "close", "cancel"].includes(action ?? "")) {
    const id = positiveId(input.enquiry_id),
      e = await enquiry(state, id);
    buyer(state, e, input.company_id);
    if (action === "review") {
      verifiedCompany(state, input.company_id, "procurement");
      if (!openEnquiry(e) || expired(e.quote_deadline))
        throw new AccessError(
          409,
          "deadline_passed",
          "Update the deadline before submitting.",
        );
      checked(
        (
          await state.client.rpc("submit_enquiry_for_review", {
            p_enquiry_id: id,
          })
        ).error,
      );
    } else if (action === "invite") {
      if (!openEnquiry(e))
        throw new AccessError(409, "enquiry_closed", "This enquiry is closed.");
      const supplier = positiveId(input.supplier_company_id);
      await publicCompany(state, supplier);
      checked(
        (
          await state.client.rpc("invite_supplier_to_enquiry", {
            p_enquiry_id: id,
            p_supplier_company_id: supplier,
          })
        ).error,
      );
    } else {
      if (input.confirm !== "CONFIRM")
        throw new AccessError(
          400,
          "confirmation_required",
          "Confirm closing this enquiry.",
        );
      checked(
        (
          await state.client.rpc("close_enquiry", {
            p_enquiry_id: id,
            p_cancel: action === "cancel",
          })
        ).error,
      );
    }
    return json({ redirect: "/enquiries/" + id });
  }
  if (action === "quote") {
    const e = await enquiry(state, positiveId(input.enquiry_id)),
      c = await quoteTarget(state, e, input.company_id);
    const payload = quotePayload(input, c.id, e);
    const r = await state.client.rpc("submit_quote", { p_quote: payload });
    checked(r.error);
    return json({ id: r.data, redirect: "/enquiries/" + e.id });
  }
  if (["accept", "reject", "withdraw"].includes(action ?? "")) {
    const id = positiveId(input.quote_id);
    const r = await state.client
      .from("quotes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    checked(r.error);
    if (!r.data || r.data.status !== "sent")
      throw new AccessError(
        409,
        "quote_unavailable",
        "This quote is no longer available.",
      );
    const e = await enquiry(state, r.data.enquiry_id);
    if (action === "withdraw") {
      const c = activeCompany(state, input.company_id, "sales");
      if (c.id !== r.data.supplier_company_id)
        throw new AccessError(
          403,
          "wrong_company",
          "Select the quoting supplier.",
        );
      checked(
        (await state.client.rpc("withdraw_quote", { p_quote_id: id })).error,
      );
    } else {
      buyer(state, e, input.company_id);
      if (action === "accept") {
        verifiedCompany(state, input.company_id, "procurement");
        if (input.confirm !== "CONFIRM")
          throw new AccessError(
            400,
            "confirmation_required",
            "Confirm quote acceptance.",
          );
        if (!openEnquiry(e) || expired(r.data.valid_until))
          throw new AccessError(
            409,
            "quote_expired",
            "This enquiry or quote is no longer available.",
          );
        const supplier = await publicCompany(state, r.data.supplier_company_id);
        if (supplier.verification_status !== "verified")
          throw new AccessError(
            409,
            "supplier_unavailable",
            "This supplier is unavailable.",
          );
        const accepted = await state.client.rpc("accept_quote", {
          p_quote_id: id,
        });
        checked(accepted.error);
        return json({
          deal_id: accepted.data,
          redirect: "/deals/" + positiveId(accepted.data),
          message: "Quote accepted.",
        });
      }
      checked(
        (
          await state.client.rpc("reject_quote", {
            p_quote_id: id,
            p_reason: textField(
              { ...input, reason: input.reason ?? "" },
              "reason",
              1000,
              0,
            ),
          })
        ).error,
      );
    }
    return json({ redirect: "/enquiries/" + e.id });
  }
  if (action === "send") {
    const id = await sendText(
      state,
      positiveId(input.conversation_id),
      input.company_id,
      requestId(input.client_message_id),
      textField(input, "content", 8000),
    );
    return json({ id });
  }
  if (action === "read") {
    const id = positiveId(input.conversation_id);
    await conversation(state, id, input.company_id);
    checked(
      (
        await state.client.rpc("mark_conversation_read", {
          p_conversation_id: id,
        })
      ).error,
    );
    return json({ read: true });
  }
  throw new AccessError(404, "not_found", "This action is unavailable.");
}
