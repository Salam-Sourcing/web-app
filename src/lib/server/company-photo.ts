import type { Workspace } from "./access";
import { checked } from "./catalog";
export async function companyPhoto(state: Workspace, id: number) {
  const result = await state.client
    .from("company_photos")
    .select("storage_path")
    .eq("company_id", id)
    .maybeSingle();
  checked(result.error);
  return result.data?.storage_path ?? null;
}
