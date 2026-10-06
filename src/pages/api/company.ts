import type { APIRoute } from "astro";
import { requireWorkspace } from "../../lib/server/access";
import {
  readMutation,
  positiveId,
  AccessError,
  json,
  errorResponse,
} from "../../lib/security";
export const POST: APIRoute = async (context) => {
  try {
    const input = await readMutation(context.request);
    const state = await requireWorkspace(context);
    const id = positiveId(input.company_id);
    if (!state.companies.some((company) => company.id === id))
      throw new AccessError(
        403,
        "company_unavailable",
        "Company access is unavailable.",
      );
    const access = await state.client.rpc("get_company_permissions", {
      p_company_id: id,
    });
    if (access.error)
      throw new AccessError(
        503,
        "access_unavailable",
        "Unable to verify company access.",
      );
    context.cookies.set(`ss-company-${state.user.id}`, String(id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
    return json({ redirect: "/app/account", companyChanged: true });
  } catch (error) {
    return errorResponse(error);
  }
};
