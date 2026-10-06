import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { handleCatalogAction } from "../../../lib/server/catalog-actions";
export const POST: APIRoute = async (context) => {
  try {
    return await handleCatalogAction(
      context,
      await readMutation(
        context.request,
        context.params.action === "company-update" ? 1024 * 1024 : 16384,
      ),
      context.params.action,
    );
  } catch (error) {
    return errorResponse(error);
  }
};
