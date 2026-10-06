import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../../lib/server/access";
import { conversationFeed } from "../../../lib/server/procurement";
import { json, errorResponse } from "../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context);
    return json({
      ...(await conversationFeed(state, context.url.searchParams)),
      fingerprint: fingerprint(state),
    });
  } catch (e) {
    return errorResponse(e);
  }
};
