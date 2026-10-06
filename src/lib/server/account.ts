import type { Workspace } from "./access";
import { AccessError } from "../security";
import { activeCompany, checked } from "./catalog";
import { object, rows } from "../account";
export function teamCompany(state: Workspace, expected?: unknown) {
  const company = activeCompany(state, expected, "team");
  if (!["owner", "admin"].includes(company.role))
    throw new AccessError(
      403,
      "team_unavailable",
      "Company owners and administrators manage the team.",
    );
  return company;
}
export async function team(state: Workspace) {
  const c = teamCompany(state);
  const result = await state.client.rpc("get_company_team", {
    p_company_id: c.id,
  });
  checked(result.error);
  const data = object(result.data);
  return { members: rows(data.members), invitations: rows(data.invitations) };
}
export async function notificationPreferences(state: Workspace) {
  const result = await state.client
    .from("marketplace_notification_preferences")
    .select("*")
    .eq("user_id", state.user.id)
    .maybeSingle();
  checked(result.error);
  return (
    result.data ?? {
      search_alerts: true,
      messages: true,
      enquiries: true,
      quotes: true,
      deals: true,
      listing_reviews: true,
    }
  );
}
export async function savedSearches(state: Workspace) {
  const result = await state.client
    .from("marketplace_saved_searches")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false })
    .limit(25);
  checked(result.error);
  return result.data ?? [];
}
export async function billing(state: Workspace) {
  const c = activeCompany(state, undefined, "billing");
  const [plans, subscription, invoices, pending] = await Promise.all([
    state.client
      .from("subscription_plans")
      .select(
        "id,name,description,price,currency,billing_interval,max_users,max_listings,max_enquiries_per_month",
      )
      .eq("active", true)
      .order("price"),
    state.client
      .from("subscriptions")
      .select(
        "id,plan_id,status,renewal_date,end_date,cancel_at_period_end,subscription_plans(name,price,currency,billing_interval,max_users,max_listings,max_enquiries_per_month)",
      )
      .eq("company_id", c.id)
      .in("status", ["trialing", "active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    state.client
      .from("invoices")
      .select(
        "id,invoice_number,total_amount,currency,status,issued_at,due_at,paid_at",
      )
      .eq("company_id", c.id)
      .order("issued_at", { ascending: false })
      .limit(50),
    state.client
      .from("subscription_change_requests")
      .select("id,request_type,status,created_at")
      .eq("company_id", c.id)
      .eq("status", "pending")
      .limit(1),
  ]);
  [plans, subscription, invoices, pending].forEach((r) => checked(r.error));
  return {
    plans: plans.data ?? [],
    subscription: subscription.data,
    invoices: invoices.data ?? [],
    pending: pending.data ?? [],
  };
}
