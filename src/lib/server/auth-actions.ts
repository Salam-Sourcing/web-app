import type { APIContext } from "astro";
import { AccessError, json, textField, safeNext } from "../security";
import {
  identity,
  requireClient,
  requireWorkspace,
  destination,
} from "./access";
import { clearLocalSession } from "./cookies";

export type AuthConfig = {
  captchaEnabled: boolean;
  callback: (
    request: Request,
    flow: "signup" | "recovery",
    state: string,
  ) => string;
};
export async function handleAuthAction(
  context: APIContext,
  input: Record<string, unknown>,
  action: string | undefined,
  config: AuthConfig,
): Promise<Response> {
  if (action === "logout") {
    let revoked = false;
    try {
      const pushToken = context.cookies.get("ss-push-token")?.value;
      if (pushToken) {
        try {
          await context.locals.supabase?.rpc("unregister_push_token", {
            p_token: pushToken,
          });
        } catch {}
      }
      const result = await context.locals.supabase?.auth.signOut({
        scope: "local",
      });
      revoked = Boolean(result && !result.error);
    } catch {
      revoked = false;
    } finally {
      clearLocalSession(context);
    }
    return json({
      redirect: revoked ? "/login" : "/login?notice=logout-pending",
      signedOut: true,
      remoteRevoked: revoked,
    });
  }
  const client = requireClient(context);
  const checked = (
    error: { message: string; code?: string; status?: number } | null,
  ) => {
    if (!error) return;
    const messages: Record<string, string> = {
      invalid_credentials: "Email or password is incorrect.",
      email_not_confirmed: "Confirm your email before signing in.",
      captcha_failed: "Security verification failed. Please try again.",
      over_request_rate_limit:
        "Too many attempts. Please wait before trying again.",
      over_email_send_rate_limit:
        "Please wait before requesting another email.",
      mfa_verification_failed:
        "The authenticator code is incorrect or expired.",
      reauthentication_needed:
        "Request a verification code and enter it to update your password.",
      reauthentication_not_valid:
        "The verification code is invalid or expired.",
      same_password: "Choose a password different from your current password.",
      weak_password: "Choose a stronger password.",
      validation_failed: "Check your details and try again.",
    };
    throw new AccessError(
      error.status === 429 ? 429 : 400,
      error.code ?? "auth_failed",
      messages[error.code ?? ""] ??
        "Unable to complete sign-in. Check your details and retry.",
    );
  };
  const captcha = () =>
    config.captchaEnabled ? textField(input, "captcha_token", 2048) : undefined;
  const startEmailFlow = (flow: "signup" | "recovery") => {
    context.cookies.set("ss-next", safeNext(input.next), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
      maxAge: 3600,
    });
    const state = crypto.randomUUID();
    const url = config.callback(context.request, flow, state);
    context.cookies.set(
      "ss-auth-flow",
      JSON.stringify({ state, flow, expires: Date.now() + 3600000 }),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: context.url.protocol === "https:",
        maxAge: 3600,
      },
    );
    return url;
  };
  const email = () => {
    const value = textField(input, "email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new AccessError(
        400,
        "invalid_email",
        "Enter a valid email address.",
      );
    return value;
  };
  if (action === "login") {
    const result = await client.auth.signInWithPassword({
      email: email(),
      password: textField(input, "password", 4096),
      options: { captchaToken: captcha() },
    });
    checked(result.error);
    // Validate readiness now, not only after navigating to the workspace.
    const target = await destination(context, input.next);
    if (!target.startsWith("/auth/mfa")) await requireWorkspace(context);
    return json({ redirect: target });
  }
  if (action === "signup") {
    const first = textField(input, "first_name", 80);
    const last = textField(input, "last_name", 80);
    const intent = textField(input, "intent", 4);
    if (!["buy", "sell", "both"].includes(intent))
      throw new AccessError(
        400,
        "invalid_intent",
        "Choose how you plan to use Salam Sourcing.",
      );
    const result = await client.auth.signUp({
      email: email(),
      password: textField(input, "password", 128, 8),
      options: {
        captchaToken: captcha(),
        emailRedirectTo: startEmailFlow("signup"),
        data: { first_name: first, last_name: last },
      },
    });
    checked(result.error);
    // Intent is presentation only. No role or permission is assigned from metadata.
    context.cookies.set("ss-intent", intent, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
    });
    if (result.data.session) {
      checked(
        await client
          .rpc("ensure_current_profile", {
            p_first_name: first,
            p_last_name: last,
          })
          .then((r) => r.error),
      );
      return json({ redirect: await destination(context, input.next) });
    }
    return json({ redirect: "/verify-email" });
  }
  if (action === "reset") {
    checked(
      (
        await client.auth.resetPasswordForEmail(email(), {
          captchaToken: captcha(),
          redirectTo: startEmailFlow("recovery"),
        })
      ).error,
    );
    return json({
      message:
        "If an account matches that email, a recovery link will arrive shortly. Open it in this browser.",
    });
  }
  if (action === "password" || action === "reauthenticate") {
    await requireWorkspace(context); // Recovery cannot bypass an enrolled second factor.
    if (action === "reauthenticate") {
      checked((await client.auth.reauthenticate()).error);
      return json({ message: "Check your email for the verification code." });
    }
    const password = textField(input, "password", 128, 8);
    if (password !== input.confirm_password)
      throw new AccessError(
        400,
        "password_mismatch",
        "Passwords do not match.",
      );
    const nonce =
      typeof input.nonce === "string" && input.nonce.trim()
        ? textField(input, "nonce", 128)
        : undefined;
    checked((await client.auth.updateUser({ password, nonce })).error);
    return json({
      redirect: "/account",
      message: "Your password was updated.",
    });
  }
  if (action === "mfa-verify") {
    const signedIn = await identity(client);
    const factorId = textField(input, "factor_id", 100);
    const code = textField(input, "code", 6, 6);
    if (!/^\d{6}$/.test(code))
      throw new AccessError(
        400,
        "invalid_code",
        "Enter the six-digit authenticator code.",
      );
    let factor = signedIn.factors.find((f) => f.id === factorId);
    if (input.purpose === "enrollment") {
      await requireWorkspace(context);
      factor = signedIn.allFactors.find(
        (f) =>
          f.id === factorId &&
          f.status === "unverified" &&
          f.factor_type === "totp",
      );
    }
    if (!factor)
      throw new AccessError(
        403,
        "factor_unavailable",
        "This authenticator is unavailable. Refresh and retry.",
      );
    checked(
      (await client.auth.mfa.challengeAndVerify({ factorId, code })).error,
    );
    return json({ redirect: safeNext(input.next, "/account/security") });
  }
  if (action === "mfa-enroll") {
    const signedIn = await requireWorkspace(context);
    if (signedIn.factors.length)
      throw new AccessError(
        409,
        "already_enrolled",
        "Two-factor authentication is already enabled.",
      );
    for (const factor of signedIn.allFactors) {
      if (factor.factor_type === "totp" && factor.status === "unverified")
        checked(
          (await client.auth.mfa.unenroll({ factorId: factor.id })).error,
        );
    }
    const result = await client.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Salam Sourcing",
      friendlyName: "Authenticator app",
    });
    checked(result.error);
    return json(result.data);
  }
  if (action === "mfa-remove" || action === "mfa-cancel") {
    const signedIn = await requireWorkspace(context);
    const factorId = textField(input, "factor_id", 100);
    const status = action === "mfa-cancel" ? "unverified" : "verified";
    if (
      !signedIn.allFactors.some(
        (f) =>
          f.id === factorId && f.factor_type === "totp" && f.status === status,
      )
    )
      throw new AccessError(
        403,
        "factor_unavailable",
        "This authenticator is unavailable.",
      );
    if (action === "mfa-remove" && input.confirm !== "REMOVE")
      throw new AccessError(
        400,
        "confirmation_required",
        "Type REMOVE to confirm.",
      );
    checked((await client.auth.mfa.unenroll({ factorId })).error);
    return json({ redirect: "/account/security" });
  }
  throw new AccessError(404, "not_found", "This action is unavailable.");
}
