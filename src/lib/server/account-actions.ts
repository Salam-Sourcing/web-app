import { preferredCurrency } from "../listing-currency";
import type { APIContext } from "astro";
import { preservedText } from "../client-contracts";
import { requireWorkspace } from "./access";
import { activeCompany, checked } from "./catalog";
import { teamCompany } from "./account";
import { AccessError, json, positiveId, textField } from "../security";
import {
  uuid,
  email,
  object,
  permissionOverride,
  preferences,
  teamRoles,
} from "../account";
import { notificationTarget } from "./notification-target";

export async function handleAccountAction(
  context: APIContext,
  input: Record<string, unknown>,
  action: string | undefined,
  callback?: (request: Request, flow: "email_change", state: string) => string,
) {
  const state = await requireWorkspace(context),
    client = state.client;
  const done = (redirect: string) => json({ redirect });
  if (action === "notification-open")
    return json(await notificationTarget(context, state, positiveId(input.id)));
  if (action === "currency") {
    let currency: string | null;
    try {
      currency = preferredCurrency(input.currency);
    } catch {
      throw new AccessError(
        400,
        "invalid_currency",
        "Choose a supported display currency.",
      );
    }
    const result = await client
      .from("listing_currency_preferences")
      .upsert({ user_id: state.user.id, currency })
      .select("currency")
      .single();
    checked(result.error);
    return done("/account/currency");
  }
  if (action === "profile") {
    const existing = await client
      .from("profiles")
      .select("first_name,last_name,contact_number,country")
      .eq("id", state.user.id)
      .single();
    checked(existing.error);
    if (!existing.data)
      throw new AccessError(
        404,
        "profile_unavailable",
        "Profile unavailable. Refresh before editing.",
      );
    const first = preservedText(
        input,
        "first_name",
        80,
        existing.data.first_name,
      ),
      last = preservedText(input, "last_name", 80, existing.data.last_name),
      target = email(input.email);
    const contact =
        preservedText(
          input,
          "contact_number",
          60,
          existing.data.contact_number,
          0,
        ) || null,
      country =
        preservedText(input, "country", 100, existing.data.country, 0) || null;
    // Email is changed only through Auth, never by writing the profile email column.
    const update: { data: Record<string, string>; email?: string } = {
      data: { first_name: first, last_name: last },
    };
    let redirectTo: string | undefined;
    if (target !== state.user.email?.toLowerCase()) {
      const nonce = crypto.randomUUID();
      if (!callback)
        throw new AccessError(
          503,
          "origin_configuration",
          "Email-change configuration is unavailable.",
        );
      redirectTo = callback(context.request, "email_change", nonce);
      context.cookies.set(
        "ss-auth-flow",
        JSON.stringify({
          state: nonce,
          flow: "email_change",
          expires: Date.now() + 3600000,
        }),
        {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: context.url.protocol === "https:",
        },
      );
      update.email = target;
    }
    const auth = await client.auth.updateUser(update, {
      emailRedirectTo: redirectTo,
    });
    if (auth.error)
      throw new AccessError(
        400,
        "profile_auth",
        "Unable to update your account. Check your email address and try again.",
      );
    checked(
      (
        await client
          .from("profiles")
          .update({
            first_name: first,
            last_name: last,
            contact_number: contact,
            country,
          })
          .eq("id", state.user.id)
      ).error,
    );
    return json({
      message: update.email
        ? "Profile saved. Confirm the email-change links in your current and new inboxes, using this browser."
        : "Profile saved.",
      contextChanged: true,
    });
  }
  if (action === "invite") {
    const c = teamCompany(state, input.company_id),
      role = textField(input, "role", 20);
    if (
      !teamRoles.includes(role as any) ||
      (role === "admin" && c.role !== "owner")
    )
      throw new AccessError(
        403,
        "invalid_role",
        "Only the owner can invite administrators.",
      );
    const result = await client.rpc("invite_company_member", {
      p_company_id: c.id,
      p_email: email(input.email),
      p_role: role,
    });
    checked(result.error);
    return done("/account/team");
  }
  if (action === "member") {
    const c = teamCompany(state, input.company_id),
      member = uuid(input.user_id);
    if (input.confirm !== "CONFIRM")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm this member change.",
      );
    const role = textField(input, "role", 20),
      remove = input.operation === "remove";
    if (!teamRoles.includes(role as any))
      throw new AccessError(400, "invalid_role", "Choose a valid team role.");
    checked(
      (
        await client.rpc("update_company_member", {
          p_company_id: c.id,
          p_user_id: member,
          p_role: role,
          p_remove: remove,
        })
      ).error,
    );
    return json({ redirect: "/account/team", contextChanged: true });
  }
  if (action === "permissions") {
    const c = teamCompany(state, input.company_id);
    if (c.role !== "owner")
      throw new AccessError(
        403,
        "owner_required",
        "Only the owner manages permission restrictions.",
      );
    const overrides = permissionOverride(input);
    // Supabase's generated type does not express nullable RPC arguments.
    checked(
      (
        await client.rpc("set_member_permissions", {
          p_company_id: c.id,
          p_user_id: uuid(input.user_id),
          p_permissions: overrides!,
        })
      ).error,
    );
    return json({ redirect: "/account/team", contextChanged: true });
  }
  if (action === "revoke-invitation") {
    const c = teamCompany(state, input.company_id),
      id = uuid(input.invitation_id);
    const current = await client.rpc("get_company_team", {
      p_company_id: c.id,
    });
    checked(current.error);
    if (!object(current.data).invitations.some((i: any) => i.id === id))
      throw new AccessError(
        404,
        "invitation_unavailable",
        "Invitation unavailable.",
      );
    checked(
      (await client.rpc("revoke_company_invitation", { p_invitation_id: id }))
        .error,
    );
    return done("/account/team");
  }
  if (action === "invitation-preview")
    return done("/invitations/" + uuid(input.invitation_id));
  if (action === "accept-invitation") {
    const id = uuid(input.invitation_id);
    if (input.confirm !== "ACCEPT")
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm the company and invited role before accepting.",
      );
    checked(
      (await client.rpc("get_company_invitation", { p_invitation_id: id }))
        .error,
    );
    const result = await client.rpc("accept_company_invitation", {
      p_invitation_id: id,
    });
    checked(result.error);
    const company = positiveId(result.data);
    checked(
      (await client.rpc("get_company_permissions", { p_company_id: company }))
        .error,
    );
    context.cookies.set("ss-company-" + state.user.id, String(company), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
      maxAge: 2592000,
    });
    return json({ redirect: "/account", companyChanged: true });
  }
  if (action === "billing") {
    const c = activeCompany(state, input.company_id, "billing"),
      kind = textField(input, "request_type", 10);
    if (
      !["start", "change", "cancel"].includes(kind) ||
      input.confirm !== "REQUEST"
    )
      throw new AccessError(
        400,
        "confirmation_required",
        "Confirm this billing request.",
      );
    checked(
      (
        await client.rpc("request_subscription_change", {
          p_company_id: c.id,
          p_request_type: kind,
          ...(kind !== "cancel"
            ? { p_plan_id: positiveId(input.plan_id) }
            : {}),
        })
      ).error,
    );
    return done("/account/billing");
  }
  if (action === "preferences") {
    const changes = Object.fromEntries(
      preferences.map((key) => [key, input[key] === "on"]),
    );
    checked(
      (
        await client.from("marketplace_notification_preferences").upsert({
          ...changes,
          user_id: state.user.id,
          updated_at: new Date().toISOString(),
        })
      ).error,
    );
    return json({ message: "Notification preferences saved." });
  }
  if (
    ["notification-read", "notifications-read", "notification-delete"].includes(
      action ?? "",
    )
  ) {
    const id = action !== "notifications-read" ? positiveId(input.id) : null;
    let q =
      action === "notification-delete"
        ? client.from("notifications").delete()
        : client
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() });
    q = q.eq("user_id", state.user.id);
    if (id) q = q.eq("id", id);
    else q = q.eq("is_read", false);
    checked((await q).error);
    return done("/account/notifications");
  }
  if (action === "search-delete") {
    checked(
      (
        await client
          .from("marketplace_saved_searches")
          .delete()
          .eq("id", positiveId(input.id))
          .eq("user_id", state.user.id)
      ).error,
    );
    return done("/account/searches");
  }
  if (action === "search-save") {
    const kind = textField(input, "kind", 10),
      frequency = textField(input, "frequency", 10);
    if (
      !["listing", "rfq"].includes(kind) ||
      !["daily", "hourly"].includes(frequency)
    )
      throw new AccessError(
        400,
        "invalid_input",
        "Choose a valid search type and alert frequency.",
      );
    let filters: Record<string, any>;
    try {
      filters = object(JSON.parse(textField(input, "filters", 4096)));
    } catch {
      throw new AccessError(
        400,
        "invalid_filters",
        "Choose valid search filters.",
      );
    }
    const result = await client.rpc("save_marketplace_search", {
      p_name: textField(input, "name", 80),
      p_kind: kind,
      p_filters: filters,
      p_alerts: input.alerts === "on",
      p_frequency: frequency,
      ...(input.id ? { p_id: positiveId(input.id) } : {}),
    });
    checked(result.error);
    return done("/account/searches/" + result.data);
  }
  if (
    ["support-reply", "support-appeal", "support-recovery"].includes(
      action ?? "",
    )
  ) {
    const operation = action!.slice(8),
      data: Record<string, string> = {};
    if (operation === "reply") data.reply = textField(input, "reply", 10000);
    else {
      data.reason = textField(input, "reason", 10000, 10);
      data.entity_type =
        operation === "recovery"
          ? "company"
          : textField(input, "entity_type", 20);
      if (
        !["company", "listing", "verification", "rfq"].includes(
          data.entity_type,
        )
      )
        throw new AccessError(
          400,
          "invalid_subject",
          "Choose a valid support subject.",
        );
      data.entity_id = String(positiveId(input.entity_id));
      if (operation === "recovery")
        data.proposed_owner = uuid(input.proposed_owner);
    }
    const result = await client.rpc("customer_support", {
      p_action: operation,
      p_data: data,
      ...(operation === "reply"
        ? { p_id: uuid(input.id), p_version: positiveId(input.version) }
        : {}),
    });
    if (result.error?.code === "40001")
      throw new AccessError(
        409,
        "request_changed",
        "This request changed. Refresh before replying.",
      );
    checked(result.error);
    return done("/account/support");
  }
  throw new AccessError(
    404,
    "not_found",
    "This account action is unavailable.",
  );
}
