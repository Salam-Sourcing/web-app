import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { procurementAction } from "../../../lib/server/procurement-actions";
export const POST: APIRoute = async (context) => {
  try {
    return await procurementAction(
      context,
      await readMutation(
        context.request,
        context.params.action === "send" ? 65536 : 16384,
      ),
      context.params.action,
    );
  } catch (e) {
    return errorResponse(e);
  }
};
