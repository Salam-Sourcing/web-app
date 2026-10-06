import type { APIContext } from "astro";
import type { Workspace } from "./access";
import { workspace } from "./access";
import { AccessError } from "../security";
import {
  checked,
  activeCompany,
  publicListing,
  publicCompany,
  companyManager,
} from "./catalog";
import { supportNotice } from "../notification-display";
import { conversation, enquiry, quoteBundle } from "./procurement";
import { dealBundle } from "./deals";

// Notification data/link_url is never navigation authority. Resolve the actual
// owned row, its recipient company and the current RLS-filtered business record.
export async function notificationTarget(
  context: APIContext,
  state: Workspace,
  id: number,
) {
  const result = await state.client
    .from("notifications")
    .select("id,entity_type,entity_id,recipient_company_id,data")
    .eq("id", id)
    .eq("user_id", state.user.id)
    .maybeSingle();
  checked(result.error);
  const n = result.data;
  if (!n)
    throw new AccessError(
      404,
      "notification_unavailable",
      "This update is no longer available.",
    );
  let selected = state;
  if (n.recipient_company_id) {
    if (!state.companies.some((c) => c.id === n.recipient_company_id))
      throw new AccessError(
        403,
        "company_unavailable",
        "Company access is no longer available.",
      );
    selected = await workspace(state.client, String(n.recipient_company_id));
  }
  let path = supportNotice(n.data)
    ? "/account/support"
    : "/account/notifications";
  if (!supportNotice(n.data) && n.entity_id) {
    const entity = n.entity_id;
    if (n.entity_type === "conversation") {
      await conversation(selected, entity);
      path = "/messages/" + entity;
    } else if (n.entity_type === "enquiry") {
      const e = await enquiry(selected, entity),
        c = activeCompany(selected);
      activeCompany(
        selected,
        undefined,
        c.id === e.buyer_company_id ? "procurement" : "sales",
      );
      path = "/enquiries/" + entity;
    } else if (n.entity_type === "quote") {
      await quoteBundle(selected, entity);
      path = "/quotes/" + entity;
    } else if (n.entity_type === "deal") {
      await dealBundle(selected, entity);
      path = "/deals/" + entity;
    } else if (n.entity_type === "listing") {
      const r = await selected.client
        .from("listings")
        .select("company_id")
        .eq("id", entity)
        .maybeSingle();
      checked(r.error);
      if (!r.data)
        throw new AccessError(
          404,
          "record_unavailable",
          "This listing is unavailable.",
        );
      if (r.data.company_id === selected.company?.id) {
        activeCompany(selected, undefined, "listings");
        path = "/sell/" + entity;
      } else {
        await publicListing(selected, entity);
        path = "/listings/" + entity;
      }
    } else if (
      n.entity_type === "company_verification" ||
      n.entity_type === "verification"
    ) {
      const record = await selected.client
        .from("company_verifications")
        .select("company_id")
        .eq("id", entity)
        .maybeSingle();
      checked(record.error);
      const companyId = record.data?.company_id;
      if (
        !companyId ||
        !state.companies.some((c) => c.id === companyId) ||
        (n.recipient_company_id && n.recipient_company_id !== companyId)
      )
        throw new AccessError(
          404,
          "record_unavailable",
          "This verification is unavailable.",
        );
      if (selected.company?.id !== companyId)
        selected = await workspace(state.client, String(companyId));
      companyManager(selected);
      path = "/company";
    } else if (n.entity_type === "company") {
      if (entity === selected.company?.id) path = "/company";
      else {
        await publicCompany(selected, entity);
        path = "/suppliers/" + entity;
      }
    } else if (n.entity_type === "saved_search") {
      checked(
        (
          await selected.client.rpc("get_saved_search_matches", {
            p_search_id: entity,
          })
        ).error,
      );
      path = "/account/searches/" + entity;
    }
  }
  if (selected.company?.id !== state.company?.id)
    context.cookies.set(
      "ss-company-" + state.user.id,
      String(selected.company!.id),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: context.url.protocol === "https:",
        maxAge: 2592000,
      },
    );
  return {
    redirect: path,
    companyChanged: selected.company?.id !== state.company?.id,
  };
}
