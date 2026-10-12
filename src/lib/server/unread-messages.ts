import type { Workspace } from "./access";
import { checked } from "./catalog";

export async function unreadMessageCount(state: Workspace): Promise<number> {
  if (!state.company) return 0;
  const result = await state.client.rpc("get_unread_message_count", {
    p_company_id: state.company.id,
  });
  checked(result.error);
  return result.data ?? 0;
}
