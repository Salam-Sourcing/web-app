import type { APIRoute } from "astro";
import { errorResponse, readMutation } from "../../../lib/security";
import { callbackUrl, serverConfig } from "../../../lib/server/config";
import { handleAuthAction } from "../../../lib/server/auth-actions";

export const POST: APIRoute = async (context) => {
  try {
    const input = await readMutation(context.request);
    return await handleAuthAction(context, input, context.params.action, {
      captchaEnabled: serverConfig().captchaEnabled,
      callback: callbackUrl,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
