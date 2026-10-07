import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { procurementAction } from "../../../lib/server/procurement-actions";
import { procurementRequestLimit } from "../../../lib/request-limits";
export const POST: APIRoute = async (context) => {
  try {
    return await procurementAction(
      context,
      await readMutation(
        context.request,
        procurementRequestLimit(context.params.action),
      ),
      context.params.action,
    );
  } catch (e) {
    return errorResponse(e);
  }
};
