import type { Workspace } from "./access";
import { checked } from "./catalog";
import { notificationCanOpen } from "../notification-display";
export async function notificationFeed(state: Workspace) {
  const result = await state.client.rpc("get_notification_feed", {
    p_limit: 100,
  });
  checked(result.error);
  return (result.data ?? []).map(({ data, ...notice }) => ({
    ...notice,
    can_open: notificationCanOpen({ ...notice, data }),
  }));
}
