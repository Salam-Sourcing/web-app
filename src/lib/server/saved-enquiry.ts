import type { Workspace } from "./access";
import { checked } from "./catalog";
/** saved_enquiries has a composite key, unlike saved_listings. */
export async function savedEnquiry(state: Workspace, id: number): Promise<{
  data: { enquiry_id: number } | null;
  error: { message: string; code: string } | null;
}> {
  const result = await state.client
    .from("saved_enquiries")
    .select("enquiry_id")
    .eq("enquiry_id", id)
    .eq("user_id", state.user.id)
    .maybeSingle();
  checked(result.error);
  return result;
}
