import type { APIRoute } from "astro";
import { uuid } from "../../lib/account";
export const GET: APIRoute = (context) => {
  try {
    const id = uuid(context.params.id);
    return context.redirect("/app/invitations/" + id, 303);
  } catch {
    return new Response("Invitation unavailable.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
};
