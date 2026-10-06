import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../../lib/server/access";
import { search, savedSuppliers } from "../../../lib/server/catalog";
import { searchInput } from "../../../lib/catalog";
import { json, errorResponse } from "../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context);
    const page =
      context.url.searchParams.get("tab") === "suppliers"
        ? await savedSuppliers(
            state,
            searchInput(context.url.searchParams).offset,
          )
        : await search(state, context.url.searchParams);
    return json({ ...page, fingerprint: fingerprint(state) });
  } catch (error) {
    return errorResponse(error);
  }
};
