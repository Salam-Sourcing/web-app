import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../lib/server/access";
import { listingCurrencyState } from "../../lib/server/listing-currency";
import { json, errorResponse } from "../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context);
    return json({
      ...(await listingCurrencyState(
        state,
        context.url.searchParams.get("rates") === "1",
      )),
      fingerprint: fingerprint(state),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
