import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import {
  requireWorkspace,
  workspace,
  fingerprint,
} from "../../../lib/server/access";
import { conversation } from "../../../lib/server/procurement";
import { serverConfig } from "../../../lib/server/config";
import { AccessError, errorResponse, positiveId } from "../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    if (context.request.headers.get("sec-fetch-site") === "cross-site")
      throw new AccessError(
        403,
        "invalid_origin",
        "Open messages from this website.",
      );
    const state = await requireWorkspace(context),
      param = context.url.searchParams.get("conversation");
    const id = param ? positiveId(param) : null;
    if (id) await conversation(state, id);
    // Identity, MFA and active profile were verified before obtaining this user's token.
    const session = await state.client.auth.getSession();
    if (session.error || !session.data.session)
      throw new AccessError(
        401,
        "sign_in_required",
        "Please sign in again.",
        "/login",
      );
    const config = serverConfig(),
      live = createClient(config.url, config.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    await live.realtime.setAuth(session.data.session.access_token);
    let closed = false,
      channel: ReturnType<typeof live.channel> | undefined,
      timer: ReturnType<typeof setTimeout> | undefined,
      guard: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      if (guard) clearInterval(guard);
      if (channel) void live.removeChannel(channel);
      live.realtime.disconnect();
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (event: string, data: unknown = {}) => {
          if (!closed)
            controller.enqueue(
              new TextEncoder().encode(
                "event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n",
              ),
            );
        };
        const finish = () => {
          if (!closed) {
            emit("retry");
            stop();
            controller.close();
          }
        };
        timer = setTimeout(finish, 55000);
        context.request.signal.addEventListener(
          "abort",
          () => {
            stop();
            try {
              controller.close();
            } catch {}
          },
          { once: true },
        );
        let checking = false;
        guard = setInterval(async () => {
          if (checking || closed) return;
          checking = true;
          try {
            const fresh = await workspace(
              state.client,
              String(state.company?.id ?? ""),
            );
            if (closed) return;
            if (fingerprint(fresh) !== fingerprint(state)) {
              emit("boundary");
              stop();
              controller.close();
              return;
            }
            if (id) await conversation(fresh, id);
            if (closed) return;
            emit("heartbeat");
          } catch {
            if (closed) return;
            emit("boundary");
            stop();
            controller.close();
          } finally {
            checking = false;
          }
        }, 25000);
        channel = live
          .channel("web-messages-" + crypto.randomUUID())
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              ...(id ? { filter: "conversation_id=eq." + id } : {}),
            },
            (payload) =>
              emit("change", {
                id:
                  ("id" in payload.new ? payload.new.id : null) ??
                  ("id" in payload.old ? payload.old.id : null),
              }),
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "conversations",
              ...(id ? { filter: "id=eq." + id } : {}),
            },
            () => emit("change"),
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "messages",
              ...(id ? { filter: "conversation_id=eq." + id } : {}),
            },
            (payload) =>
              emit("change", {
                id:
                  ("id" in payload.new ? payload.new.id : null) ??
                  ("id" in payload.old ? payload.old.id : null),
              }),
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
              ...(id ? { filter: "id=eq." + id } : {}),
            },
            () => emit("change"),
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") emit("ready");
            else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status))
              finish();
          });
        if (context.request.signal.aborted) {
          stop();
          controller.close();
        }
      },
      cancel() {
        stop();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
