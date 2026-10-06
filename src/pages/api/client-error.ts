import type { APIRoute } from "astro";
import {
  readMutation,
  json,
  errorResponse,
  AccessError,
} from "../../lib/security";
import { requireWorkspace } from "../../lib/server/access";
import { clientErrorEvent, diagnosticGroup } from "../../lib/client-errors";
export const POST: APIRoute = async (context) => {
  try {
    const event = clientErrorEvent(await readMutation(context.request, 4096));
    if (!event)
      throw new AccessError(400, "invalid_event", "Invalid diagnostic event.");
    await requireWorkspace(context);
    // Immutable bundle locations and a stable group; no raw errors/stacks,
    // private URLs, account IDs, tokens or record contents.
    console.warn(
      JSON.stringify({
        event: "marketplace_client_error",
        schema: 1,
        group: diagnosticGroup(event),
        ...event,
      }),
    );
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
};
