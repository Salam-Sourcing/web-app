import type { APIRoute } from "astro";
import { requireWorkspace } from "../../../lib/server/access";
import { checked } from "../../../lib/server/catalog";
import { errorResponse, readMutation } from "../../../lib/security";
import { personalExport } from "../../../lib/account";
export const POST: APIRoute = async (context) => {
  try {
    await readMutation(context.request);
    const state = await requireWorkspace(context);
    const data = await personalExport(async (page) => {
      const r = await state.client.rpc("panel_customer_export", {
        p_page: page,
      });
      checked(r.error);
      return r.data;
    }, state.user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="salam-personal-data.json"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
