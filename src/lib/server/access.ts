import type { APIContext } from "astro";
import type { SupabaseClient, User, Factor } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import {
  AccessError,
  selectCompany,
  defaultSafetyCompany,
  safeNext,
  type CompanySummary,
} from "../security";

export type Client = SupabaseClient<Database>;
export type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "first_name" | "last_name" | "email" | "status"
>;
// RPC type generation cannot express nullable return columns; preserve actual SQL nulls.
export type Company = CompanySummary;
export type Identity = {
  client: Client;
  user: User;
  factors: Factor[];
  allFactors: Factor[];
  needsMfa: boolean;
};
export type Workspace = Identity & {
  profile: Profile;
  companies: Company[];
  company: Company | null;
  safetyCompany: Company | null;
  permissions: string[];
};

export function requireClient(context: APIContext): Client {
  if (!context.locals.supabase)
    throw new AccessError(
      503,
      "not_configured",
      "Sign-in is unavailable until this website is configured. Contact support.",
    );
  return context.locals.supabase;
}
export async function identity(client: Client): Promise<Identity> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) {
    if (error && (!error.status || error.status >= 500))
      throw new AccessError(
        503,
        "access_unavailable",
        "Connect to the internet so we can verify your access.",
      );
    throw new AccessError(
      401,
      "sign_in_required",
      "Please sign in again.",
      "/login",
    );
  }
  const factors = await client.auth.mfa.listFactors();
  if (factors.error)
    throw new AccessError(
      503,
      "access_unavailable",
      "Unable to verify your account security. Please retry.",
    );
  if (
    factors.data.phone.length ||
    factors.data.all.some(
      (f) => f.status === "verified" && f.factor_type !== "totp",
    )
  )
    throw new AccessError(
      403,
      "unsupported_factor",
      "This account needs a security method unavailable here. Contact support.",
    );
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error)
    throw new AccessError(
      503,
      "access_unavailable",
      "Unable to verify your session. Please retry.",
    );
  // Fresh factor list handles enrollment on another device; cached JWT factors are insufficient.
  const needsMfa =
    factors.data.totp.length > 0 && assurance.data.currentLevel !== "aal2";
  return {
    client,
    user: data.user,
    factors: factors.data.totp,
    allFactors: factors.data.all,
    needsMfa,
  };
}
export async function workspace(
  client: Client,
  savedCompany?: string,
): Promise<Workspace> {
  const signedIn = await identity(client);
  if (signedIn.needsMfa)
    throw new AccessError(
      403,
      "mfa_required",
      "Verify your authenticator to continue.",
      "/auth/mfa",
    );
  // This read is guarded by the hosted private.has_active_session RLS policy.
  const result = await client
    .from("profiles")
    .select("id,first_name,last_name,email,status")
    .eq("id", signedIn.user.id)
    .maybeSingle();
  if (result.error)
    throw new AccessError(
      503,
      "access_unavailable",
      "Unable to verify your account access. Please retry.",
    );
  if (!result.data || result.data.status !== "active")
    throw new AccessError(
      403,
      "account_unavailable",
      "This account is unavailable. Contact support.",
    );
  const companies = await client.rpc("get_my_companies");
  if (companies.error)
    throw new AccessError(
      503,
      "access_unavailable",
      "Unable to load your companies. Please retry.",
    );
  const rows = companies.data ?? [];
  const company = selectCompany(rows, savedCompany);
  let permissions: string[] = [];
  if (company) {
    const result = await client.rpc("get_company_permissions", {
      p_company_id: company.id,
    });
    if (result.error)
      throw new AccessError(
        503,
        "access_unavailable",
        "Unable to verify company permissions. Please retry.",
      );
    permissions = result.data ?? [];
  }
  return {
    ...signedIn,
    profile: result.data,
    companies: rows,
    company,
    safetyCompany: defaultSafetyCompany(rows),
    permissions,
  };
}
export async function requireWorkspace(
  context: APIContext,
): Promise<Workspace> {
  if (context.locals.workspace) return context.locals.workspace;
  const client = requireClient(context);
  const signedIn = await identity(client);
  const state = await workspace(
    client,
    context.cookies.get(`ss-company-${signedIn.user.id}`)?.value,
  );
  context.locals.workspace = state;
  return state;
}
export async function destination(
  context: APIContext,
  next?: unknown,
): Promise<string> {
  const state = await identity(requireClient(context));
  const target = safeNext(next);
  return state.needsMfa
    ? `/auth/mfa?next=${encodeURIComponent(target)}`
    : target;
}
export function fingerprint(state: Workspace): string {
  return JSON.stringify([
    state.user.id,
    state.company?.id ?? null,
    state.companies.map((c) => [c.id, c.role, c.verification_status]),
    [...state.permissions].sort(),
    state.factors.map((f) => f.id).sort(),
  ]);
}
