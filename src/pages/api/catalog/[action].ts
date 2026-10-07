import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { handleCatalogAction } from "../../../lib/server/catalog-actions";
import { catalogRequestLimit } from "../../../lib/request-limits";
export const POST: APIRoute = async (context) => {
  try {
    return await handleCatalogAction(
      context,
      await readMutation(
        context.request,
        catalogRequestLimit(context.params.action),
      ),
      context.params.action,
    );
  } catch (error) {
    return errorResponse(error);
  }
};
