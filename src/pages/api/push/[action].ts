import type { APIRoute } from "astro";
import { requireWorkspace } from "../../../lib/server/access";
import { checked } from "../../../lib/server/catalog";
import { webPushConfig } from "../../../lib/server/web-push-config";
import {
  AccessError,
  readMutation,
  textField,
  positiveId,
  json,
  errorResponse,
} from "../../../lib/security";
export const POST: APIRoute = async (context) => {
  try {
    const input = await readMutation(context.request),
      state = await requireWorkspace(context),
      client = state.client;
    const cookie = "ss-push-token";
    if (context.params.action === "register") {
      if (!webPushConfig().configured || context.url.protocol !== "https:")
        throw new AccessError(
          503,
          "push_unavailable",
          "Browser notifications require a configured HTTPS website.",
        );
      const token = textField(input, "token", 4096, 20),
        previous = context.cookies.get(cookie)?.value;
      checked(
        (
          await client.rpc("register_web_push_token", {
            p_token: token,
            p_origin: context.url.origin,
            ...(previous ? { p_previous_token: previous } : {}),
          })
        ).error,
      );
      context.cookies.set(cookie, token, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        maxAge: 2592000,
      });
      return json({ message: "Browser notifications enabled." });
    }
    if (context.params.action === "unregister") {
      const token = context.cookies.get(cookie)?.value;
      if (token)
        checked(
          (await client.rpc("unregister_push_token", { p_token: token })).error,
        );
      context.cookies.delete(cookie, {
        path: "/",
        secure: context.url.protocol === "https:",
      });
      return json({ message: "Browser notifications disabled." });
    }
    if (context.params.action === "test") {
      checked((await client.rpc("send_test_push_notification")).error);
      return json({
        message:
          "A test was requested. Delivery must be confirmed on this browser.",
      });
    }
    if (context.params.action === "validate") {
      const notification = await client
        .from("notifications")
        .select("id,data")
        .eq("id", positiveId(input.id))
        .eq("user_id", state.user.id)
        .eq("notification_type", "new_message")
        .maybeSingle();
      checked(notification.error);
      if (!notification.data)
        throw new AccessError(
          404,
          "notification_unavailable",
          "Update unavailable.",
        );
      const pref = await client
        .from("marketplace_notification_preferences")
        .select("messages")
        .eq("user_id", state.user.id)
        .maybeSingle();
      checked(pref.error);
      const test =
        typeof notification.data.data === "object" &&
        notification.data.data !== null &&
        !Array.isArray(notification.data.data) &&
        notification.data.data.test === true;
      if (pref.data?.messages === false && !test)
        throw new AccessError(
          403,
          "notifications_disabled",
          "Notifications disabled.",
        );
      // getUser/MFA/profile/session RLS above establish authority; decoding this
      // already-verified cookie session supplies only the delivery binding.
      const session = await client.auth.getSession();
      if (session.error || !session.data.session)
        throw new AccessError(401, "sign_in_required", "Sign in again.");
      const payload = JSON.parse(
        atob(
          session.data.session.access_token
            .split(".")[1]
            .replaceAll("-", "+")
            .replaceAll("_", "/"),
        ),
      );
      if (
        payload.sub !== state.user.id ||
        typeof payload.session_id !== "string"
      )
        throw new AccessError(403, "invalid_session", "Session unavailable.");
      return json({
        user_id: state.user.id,
        session_id: payload.session_id,
        is_test: test,
      });
    }
    throw new AccessError(404, "not_found", "Push action unavailable.");
  } catch (error) {
    return errorResponse(error);
  }
};
