import type { Workspace } from "./access";
import { activeCompany, checked, publicCompany } from "./catalog";
import { AccessError } from "../security";
import {
  historyCursor,
  expired,
  openEnquiry,
  type Enquiry,
  type Quote,
} from "../procurement";
export function verifiedCompany(
  state: Workspace,
  expected: unknown,
  scope: string,
) {
  const c = activeCompany(state, expected, scope);
  if (c.verification_status !== "verified")
    throw new AccessError(
      403,
      "verification_required",
      "Your company must be verified for this action.",
    );
  return c;
}
export async function enquiry(state: Workspace, id: number): Promise<Enquiry> {
  const result = await state.client
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checked(result.error);
  if (!result.data)
    throw new AccessError(
      404,
      "record_unavailable",
      "This enquiry is unavailable.",
    );
  return result.data;
}
export function buyer(state: Workspace, e: Enquiry, expected?: unknown) {
  const c = activeCompany(state, expected, "procurement");
  if (c.id !== e.buyer_company_id)
    throw new AccessError(
      403,
      "wrong_company",
      "Select the buyer company for this enquiry.",
    );
  return c;
}
export async function quoteTarget(
  state: Workspace,
  e: Enquiry,
  expected?: unknown,
) {
  const c = verifiedCompany(state, expected, "sales");
  if (
    c.id === e.buyer_company_id ||
    (e.enquiry_type === "direct" && e.supplier_company_id !== c.id)
  )
    throw new AccessError(
      403,
      "wrong_company",
      "This company cannot quote on this enquiry.",
    );
  if (!openEnquiry(e) || expired(e.quote_deadline))
    throw new AccessError(
      409,
      "enquiry_closed",
      "This enquiry is no longer accepting quotes.",
    );
  if (
    e.enquiry_type === "public_rfq" &&
    !(e.publication_status === "published" && e.visibility === "public")
  ) {
    const invite = await state.client
      .from("enquiry_supplier_invitations")
      .select("id")
      .eq("enquiry_id", e.id)
      .eq("supplier_company_id", c.id)
      .neq("status", "cancelled")
      .maybeSingle();
    checked(invite.error);
    if (!invite.data)
      throw new AccessError(
        403,
        "invitation_required",
        "This RFQ requires an invitation.",
      );
  }
  await publicCompany(state, e.buyer_company_id);
  return c;
}
export async function companySummaries(state: Workspace, ids: number[]) {
  if (!ids.length) return [];
  const result = await state.client.rpc("get_company_summaries", {
    p_company_ids: [...new Set(ids)],
  });
  checked(result.error);
  return result.data ?? [];
}
export async function enquiryFeed(state: Workspace, params: URLSearchParams) {
  const tab = ["all", "mine", "saved"].includes(params.get("tab") ?? "")
    ? params.get("tab")!
    : "all";
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
    throw new AccessError(400, "invalid_page", "Choose a valid page.");
  const filters = {
    tab,
    ...(tab === "mine" ? { company_id: activeCompany(state).id } : {}),
    query: (params.get("q") ?? "").trim().slice(0, 120),
    category: /^[1-9]\d*$/.test(params.get("category") ?? "")
      ? params.get("category")!
      : "",
    status: [
      "open",
      "quoted",
      "negotiating",
      "accepted",
      "closed",
      "cancelled",
    ].includes(params.get("status") ?? "")
      ? params.get("status")!
      : "",
    urgency: params.get("urgency") === "urgent" ? "urgent" : "",
  };
  const result = await state.client.rpc("search_enquiries", {
    p_filters: filters,
    p_offset: page * 24,
    p_limit: 25,
  });
  checked(result.error);
  const rows = (result.data ?? []).slice(0, 24);
  const [companies, saved] = await Promise.all([
    companySummaries(
      state,
      rows.map((r) => r.buyer_company_id),
    ),
    state.client
      .from("saved_enquiries")
      .select("enquiry_id")
      .eq("user_id", state.user.id)
      .in(
        "enquiry_id",
        rows.map((r) => r.id),
      ),
  ]);
  checked(saved.error);
  return {
    rows,
    companies,
    saved: new Set(saved.data?.map((r) => r.enquiry_id)),
    hasMore: (result.data?.length ?? 0) > 24,
    page,
    tab,
  };
}
export async function conversation(
  state: Workspace,
  id: number,
  expected?: unknown,
) {
  const c = activeCompany(state, expected);
  const result = await state.client
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checked(result.error);
  if (
    !result.data ||
    ![result.data.buyer_company_id, result.data.supplier_company_id].includes(
      c.id,
    )
  )
    throw new AccessError(
      404,
      "record_unavailable",
      "Select the company that belongs to this conversation.",
    );
  const scope = c.id === result.data.buyer_company_id ? "procurement" : "sales";
  activeCompany(state, expected, scope);
  return result.data;
}
export async function messagePage(
  state: Workspace,
  id: number,
  params: URLSearchParams,
) {
  await conversation(state, id);
  let q = state.client
    .from("messages")
    .select(
      "id,client_message_id,sender_user_id,content,message_type,is_deleted,sent_at,message_attachments(id,file_name,file_mime_type,file_size_bytes)",
    )
    .eq("conversation_id", id);
  const messageId = params.get("message_id");
  if (messageId) q = q.eq("id", Number(messageId));
  const after = params.has("after")
    ? historyCursor(
        new URLSearchParams({
          before: params.get("after")!,
          before_id: params.get("after_id") ?? "",
        }),
      )
    : null;
  const cursor = historyCursor(params);
  if (cursor)
    q = q.or(
      "sent_at.lt." +
        cursor.sent_at +
        ",and(sent_at.eq." +
        cursor.sent_at +
        ",id.lt." +
        cursor.id +
        ")",
    );
  if (after)
    q = q.or(
      "sent_at.gt." +
        after.sent_at +
        ",and(sent_at.eq." +
        after.sent_at +
        ",id.gt." +
        after.id +
        ")",
    );
  const result = await q
    .order("sent_at", { ascending: !!after })
    .order("id", { ascending: !!after })
    .limit(51);
  checked(result.error);
  const rows = after
    ? (result.data ?? []).slice(0, 50)
    : (result.data ?? []).slice(0, 50).reverse();
  const reads = await state.client
    .from("conversation_participants")
    .select("user_id,last_read_at")
    .eq("conversation_id", id)
    .neq("user_id", state.user.id);
  checked(reads.error);
  const lastRead = (reads.data ?? [])
    .map((x) => x.last_read_at)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      client_message_id:
        r.sender_user_id === state.user.id ? r.client_message_id : null,
      sent_at: r.sent_at,
      content: r.is_deleted ? "This message was deleted." : r.content,
      is_deleted: r.is_deleted,
      outgoing: r.sender_user_id === state.user.id,
      seen:
        r.sender_user_id === state.user.id &&
        !!lastRead &&
        Date.parse(r.sent_at) <= Date.parse(lastRead),
      attachments: r.is_deleted
        ? []
        : r.message_attachments.map((a) => ({
            id: a.id,
            file_name: a.file_name ?? "Attachment",
            file_mime_type: a.file_mime_type,
            file_size_bytes: a.file_size_bytes,
          })),
    })),
    hasMore: (result.data?.length ?? 0) > 50,
  };
}
export async function sendText(
  state: Workspace,
  id: number,
  companyId: unknown,
  key: string,
  text: string,
  messageType = "text",
) {
  const c = activeCompany(state, companyId);
  const cv = await conversation(state, id, companyId);
  if (cv.status !== "open")
    throw new AccessError(
      409,
      "conversation_archived",
      "This conversation is archived.",
    );
  const existing = await state.client
    .from("messages")
    .select("id,conversation_id,content,message_type,sender_company_id")
    .eq("sender_user_id", state.user.id)
    .eq("client_message_id", key)
    .maybeSingle();
  checked(existing.error);
  if (existing.data) {
    if (
      existing.data.conversation_id !== id ||
      existing.data.content !== (text || null) ||
      existing.data.message_type !== messageType ||
      existing.data.sender_company_id !== c.id
    )
      throw new AccessError(
        409,
        "retry_changed",
        "The retry must use the same company, text and request ID.",
      );
    return existing.data.id;
  }
  const result = await state.client.from("messages").upsert(
    {
      conversation_id: id,
      sender_user_id: state.user.id,
      sender_company_id: c.id,
      client_message_id: key,
      content: text || null,
      message_type: messageType,
    },
    {
      onConflict: "sender_user_id,client_message_id",
      ignoreDuplicates: true,
    },
  );
  checked(result.error);
  const confirmed = await state.client
    .from("messages")
    .select("id,conversation_id,content,message_type,sender_company_id")
    .eq("sender_user_id", state.user.id)
    .eq("client_message_id", key)
    .maybeSingle();
  checked(confirmed.error);
  if (
    !confirmed.data ||
    confirmed.data.conversation_id !== id ||
    confirmed.data.content !== (text || null) ||
    confirmed.data.message_type !== messageType ||
    confirmed.data.sender_company_id !== c.id
  )
    throw new AccessError(
      409,
      "send_unconfirmed",
      "Message could not be confirmed. Retry the same message.",
    );
  return confirmed.data.id;
}

export async function quoteBundle(state: Workspace, id: number) {
  const e = await enquiry(state, id);
  const quotes: Quote[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await state.client
      .from("quotes")
      .select("*")
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 499);
    checked(result.error);
    quotes.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
    if (quotes.length >= 5000)
      throw new AccessError(
        413,
        "comparison_too_large",
        "This enquiry has too many quote versions to compare together. Open individual quotes.",
      );
  }
  const profiles = await Promise.all(
    [...new Set(quotes.map((q) => q.supplier_company_id))].map(async (id) => {
      const result = await state.client.rpc("get_public_company_profile", {
        p_company_id: id,
      });
      checked(result.error);
      return { id, profile: result.data?.[0] ?? null };
    }),
  );
  return { enquiry: e, quotes, profiles };
}

export async function conversationFeed(
  state: Workspace,
  params: URLSearchParams,
) {
  const c = activeCompany(state);
  const status = params.get("tab") === "archived" ? "archived" : "open";
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
    throw new AccessError(400, "invalid_page", "Choose a valid page.");
  const result = await state.client
    .rpc("search_conversations", {
      p_company_id: c.id,
      p_query: (params.get("q") ?? "").trim().slice(0, 120),
      p_status: status,
      p_offset: page * 24,
      p_limit: 25,
    })
    .select("*,enquiries(title)");
  checked(result.error);
  const rows = (result.data ?? []).slice(0, 24);
  const companies = await companySummaries(
    state,
    rows
      .map((x) =>
        x.buyer_company_id === c.id
          ? x.supplier_company_id
          : x.buyer_company_id,
      )
      .filter((x): x is number => x !== null),
  );
  const enriched = await Promise.all(
    rows.map(async (cv) => {
      const other = companies.find(
        (x) =>
          x.id ===
          (cv.buyer_company_id === c.id
            ? cv.supplier_company_id
            : cv.buyer_company_id),
      );
      const [latest, read] = await Promise.all([
        state.client
          .from("messages")
          .select("content,message_type,is_deleted,sent_at")
          .eq("conversation_id", cv.id)
          .order("sent_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
        state.client
          .from("conversation_participants")
          .select("last_read_at")
          .eq("conversation_id", cv.id)
          .eq("user_id", state.user.id)
          .maybeSingle(),
      ]);
      checked(latest.error);
      checked(read.error);
      let unread = state.client
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cv.id)
        .neq("sender_user_id", state.user.id)
        .eq("is_deleted", false);
      if (read.data?.last_read_at)
        unread = unread.gt("sent_at", read.data.last_read_at);
      const count = await unread;
      checked(count.error);
      const msg = latest.data;
      return {
        id: cv.id,
        name: other?.display_name ?? "Company unavailable",
        verified: other?.verification_status === "verified",
        preview: msg?.is_deleted
          ? "This message was deleted."
          : msg?.content ||
            (msg?.message_type === "attachment"
              ? "Attachment"
              : cv.enquiries?.title || "Start a conversation"),
        time: cv.last_message_at ?? cv.created_at,
        unread: count.count ?? 0,
        enquiry: cv.enquiries?.title ?? "Enquiry",
      };
    }),
  );
  return {
    rows: enriched,
    hasMore: (result.data?.length ?? 0) > 24,
    page,
    status,
  };
}
