import type { APIRoute } from "astro";
import { requireWorkspace } from "../../lib/server/access";
import { notificationTarget } from "../../lib/server/notification-target";
import { positiveId } from "../../lib/security";
export const GET: APIRoute = async (context) => {
  const target = await notificationTarget(
    context,
    await requireWorkspace(context),
    positiveId(context.params.id),
  );
  return context.redirect(target.redirect, 303);
};
