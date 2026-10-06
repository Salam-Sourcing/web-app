import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../lib/server/access";
import { checked } from "../../lib/server/catalog";
import { json, errorResponse } from "../../lib/security";
import { notificationCanOpen } from "../../lib/notification-display";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context);
    const [list, count] = await Promise.all([
      state.client
        .from("notifications")
        .select("id,title,body,is_read,entity_type,entity_id,created_at,data")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100),
      state.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", state.user.id)
        .eq("is_read", false),
    ]);
    checked(list.error);
    checked(count.error);
    return json({
      fingerprint: fingerprint(state),
      unread: count.count ?? 0,
      rows: (list.data ?? []).map(({ data, ...notice }) => ({
        ...notice,
        can_open: notificationCanOpen({ ...notice, data }),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
