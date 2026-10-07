import type { Workspace } from "./access";
import { search } from "./catalog";
export async function relatedListings(
  state: Workspace,
  listing: { id: number; category: string },
) {
  if (!listing.category) return [];
  const result = await search(
    state,
    new URLSearchParams({ category: listing.category }),
  );
  return result.rows.filter((row) => row.id !== listing.id).slice(0, 6);
}
