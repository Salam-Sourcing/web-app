import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../lib/server/access";
import { checked } from "../../lib/server/catalog";
import { json, errorResponse } from "../../lib/security";
import { notificationFeed } from "../../lib/server/notification-feed";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context);
    const [list, count] = await Promise.all([
      notificationFeed(state),
      state.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", state.user.id)
        .eq("is_read", false),
    ]);
    checked(count.error);
    return json({
      fingerprint: fingerprint(state),
      unread: count.count ?? 0,
      rows: list,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
