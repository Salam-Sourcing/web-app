import type { APIRoute } from "astro";
import { readMutation, errorResponse } from "../../../lib/security";
import { handleAccountAction } from "../../../lib/server/account-actions";
import { callbackUrl } from "../../../lib/server/config";
export const POST: APIRoute = async (context) => {
  try {
    return await handleAccountAction(
      context,
      await readMutation(context.request, 65536),
      context.params.action,
      callbackUrl,
    );
  } catch (error) {
    return errorResponse(error);
  }
};
