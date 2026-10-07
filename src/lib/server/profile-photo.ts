import type { Workspace } from "./access";
import { checked } from "./catalog";
export async function profilePhoto(state: Workspace) {
  const result = await state.client
    .from("profile_photos")
    .select("storage_path")
    .eq("user_id", state.user.id)
    .maybeSingle();
  checked(result.error);
  return result.data?.storage_path ?? null;
}
