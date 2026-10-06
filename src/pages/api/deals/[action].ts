import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { dealAction } from "../../../lib/server/deal-actions";
export const POST: APIRoute = async (context) => {
  try {
    return await dealAction(
      context,
      await readMutation(context.request),
      context.params.action,
    );
  } catch (e) {
    return errorResponse(e);
  }
};
