import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../../lib/server/access";
import { messagePage } from "../../../lib/server/procurement";
import { positiveId, json, errorResponse } from "../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    if (context.url.searchParams.has("message_id"))
      positiveId(context.url.searchParams.get("message_id"));
    const state = await requireWorkspace(context);
    return json({
      ...(await messagePage(
        state,
        positiveId(context.params.id),
        context.url.searchParams,
      )),
      fingerprint: fingerprint(state),
    });
  } catch (e) {
    return errorResponse(e);
  }
};
