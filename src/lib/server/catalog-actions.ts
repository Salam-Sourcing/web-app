import type { APIContext } from "astro";
import { requireWorkspace } from "./access";
import { AccessError, json, positiveId, textField } from "../security";
import { companyPayload, listingPayload, allowedTransition } from "../catalog";
import {
  activeCompany,
  companyManager,
  checked,
  sellerListing,
  editableVerification,
  publicCompany,
  publicListing,
  taxonomy,
} from "./catalog";
export async function handleCatalogAction(
  context: APIContext,
  input: Record<string, unknown>,
  action: string | undefined,
): Promise<Response> {
  const state = await requireWorkspace(context);
  if (action === "company-create") {
    if (input.confirm !== "REPRESENT")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm you are authorized to represent this company.",
      );
    const payload = companyPayload(input);
    const result = await state.client
      .from("companies")
      .insert({
        ...payload,
        owner_user_id: state.user.id,
        verification_status: "unverified",
        status: "active",
      })
      .select("id")
      .single();
    checked(result.error);
    if (!result.data)
      throw new AccessError(
        503,
        "unknown_outcome",
        "Check your companies before retrying; creation could not be confirmed.",
      );
    context.cookies.set("ss-company-" + state.user.id, String(result.data.id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
      maxAge: 2592000,
    });
    return json({ redirect: "/app/company", companyChanged: true });
  }
  if (action === "company-update") {
    const company = companyManager(state, input.company_id);
    checked(
      (
        await state.client.rpc("update_company_profile", {
          p_company_id: company.id,
          p_profile: companyPayload(input),
        })
      ).error,
    );
    return json({ redirect: "/app/company", contextChanged: true });
  }
  if (action === "verification-prepare") {
    const company = companyManager(state, input.company_id);
    const result = await state.client.rpc("create_company_verification", {
      p_company_id: company.id,
    });
    checked(result.error);
    return json({ id: result.data });
  }
  if (action === "verification-submit") {
    const id = positiveId(input.verification_id);
    await editableVerification(state, id, input.company_id);
    if (input.confirm !== "SUBMIT")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm verification submission.",
      );
    checked(
      (
        await state.client.rpc("submit_company_verification", {
          p_verification_id: id,
        })
      ).error,
    );
    return json({ redirect: "/app/company", contextChanged: true });
  }
  if (action === "listing-create" || action === "listing-update") {
    const company = activeCompany(state, input.company_id, "listings");
    const payload = listingPayload(input),
      categories = await taxonomy(state);
    if (
      !categories.some((c) =>
        c.sub_categories.some((s) => s.id === payload.sub_category_id),
      )
    )
      throw new AccessError(
        400,
        "invalid_category",
        "Choose an active category.",
      );
    let id: number;
    if (action === "listing-create") {
      const result = await state.client
        .from("listings")
        .insert({
          ...payload,
          company_id: company.id,
          created_by_user_id: state.user.id,
          currency: "CAD",
          status: "draft",
        })
        .select("id")
        .single();
      checked(result.error);
      if (!result.data)
        throw new AccessError(
          503,
          "unknown_outcome",
          "Check Sell before retrying; your draft may already exist.",
        );
      id = result.data.id;
    } else {
      id = positiveId(input.listing_id);
      await sellerListing(state, id, input.company_id);
      checked(
        (
          await state.client.rpc("update_listing", {
            p_listing_id: id,
            p_changes: payload,
          })
        ).error,
      );
    }
    return json({ id, redirect: "/app/sell/" + id, message: "Draft saved." });
  }
  if (action === "listing-status") {
    const id = positiveId(input.listing_id),
      listing = await sellerListing(state, id, input.company_id),
      transition = textField(input, "transition", 10);
    if (!allowedTransition(listing.status, transition))
      throw new AccessError(
        409,
        "status_changed",
        "This listing changed. Refresh before continuing.",
      );
    if (input.confirm !== "CONFIRM")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm this listing change.",
      );
    if (
      transition === "submit" &&
      state.company?.verification_status !== "verified"
    )
      throw new AccessError(
        403,
        "verification_required",
        "Verify your company before submitting a listing.",
      );
    checked(
      (
        await state.client.rpc("set_listing_status", {
          p_listing_id: id,
          p_action: transition,
        })
      ).error,
    );
    return json({ redirect: "/app/sell/" + id });
  }
  if (action === "save") {
    const id = positiveId(input.id),
      kind = textField(input, "kind", 10);
    if (
      !["listing", "company"].includes(kind) ||
      typeof input.saved !== "boolean"
    )
      throw new AccessError(400, "invalid_input", "Choose a valid saved item.");
    if (input.saved) {
      if (kind === "listing") await publicListing(state, id);
      else await publicCompany(state, id);
    }
    let saved;
    if (kind === "listing") {
      if (input.saved)
        checked(
          (
            await state.client
              .from("saved_listings")
              .upsert(
                { user_id: state.user.id, listing_id: id },
                { onConflict: "user_id,listing_id", ignoreDuplicates: true },
              )
          ).error,
        );
      else
        checked(
          (
            await state.client
              .from("saved_listings")
              .delete()
              .eq("user_id", state.user.id)
              .eq("listing_id", id)
          ).error,
        );
      saved = await state.client
        .from("saved_listings")
        .select("id")
        .eq("user_id", state.user.id)
        .eq("listing_id", id)
        .maybeSingle();
    } else {
      if (input.saved)
        checked(
          (
            await state.client
              .from("saved_companies")
              .upsert(
                { user_id: state.user.id, company_id: id },
                { onConflict: "user_id,company_id", ignoreDuplicates: true },
              )
          ).error,
        );
      else
        checked(
          (
            await state.client
              .from("saved_companies")
              .delete()
              .eq("user_id", state.user.id)
              .eq("company_id", id)
          ).error,
        );
      saved = await state.client
        .from("saved_companies")
        .select("id")
        .eq("user_id", state.user.id)
        .eq("company_id", id)
        .maybeSingle();
    }
    checked(saved.error);
    return json({
      saved: Boolean(saved.data),
      message: saved.data
        ? "Saved to your account."
        : "Removed from saved items.",
    });
  }
  if (action === "view") {
    const id = positiveId(input.id);
    await publicListing(state, id);
    try {
      await state.client.rpc("record_marketplace_listing_view", {
        p_listing_id: id,
      });
    } catch {}
    return json({ recorded: true });
  }
  throw new AccessError(404, "not_found", "This action is unavailable.");
}
