import type { APIRoute } from "astro";
import { requireWorkspace, fingerprint } from "../../lib/server/access";
import { errorResponse, json } from "../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    return json({ fingerprint: fingerprint(await requireWorkspace(context)) });
  } catch (error) {
    return errorResponse(error);
  }
};
