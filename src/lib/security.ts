import { isPrivatePath, cleanLegacyPath } from "./routes";
export class AccessError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public redirect?: string,
  ) {
    super(message);
  }
}

export function safeNext(value: unknown, fallback = "/discover"): string {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    !value.startsWith("/") ||
    /[\\\x00-\x20]/.test(value)
  )
    return fallback;
  const parsed = new URL(value, "https://local.invalid");
  if (parsed.origin !== "https://local.invalid") return fallback;
  const path = /^\/app(?:\/|$)/.test(parsed.pathname)
    ? cleanLegacyPath(parsed.pathname)
    : parsed.pathname;
  if (!isPrivatePath(path) || !/^\/[A-Za-z0-9_/-]+$/.test(path))
    return fallback;
  if (path !== "/discover") return path;
  const filters = new URLSearchParams();
  for (const key of [
    "query",
    "category",
    "location",
    "currency",
    "min_price",
    "max_price",
    "max_moq",
    "max_lead_days",
    "verified",
    "sort",
    "type",
  ]) {
    const input = parsed.searchParams.get(key);
    if (input !== null && input.length <= 200) filters.set(key, input);
  }
  return path + (filters.size ? "?" + filters : "");
}

export function positiveId(value: unknown): number {
  const input = typeof value === "number" ? String(value) : value;
  if (typeof input !== "string" || !/^[1-9]\d*$/.test(input))
    throw new AccessError(400, "invalid_id", "Choose a valid record.");
  const number = Number(input);
  if (!Number.isSafeInteger(number))
    throw new AccessError(
      400,
      "invalid_id",
      "Record ID is outside the supported range.",
    );
  return number;
}

export function textField(
  data: Record<string, unknown>,
  key: string,
  max: number,
  min = 1,
): string {
  const raw = data[key];
  if (typeof raw !== "string" || raw.length > max || raw.trim().length < min)
    throw new AccessError(
      400,
      "invalid_input",
      `Check the ${key.replaceAll("_", " ")} field.`,
    );
  return key === "password" ? raw : raw.trim();
}

export async function readMutation(
  request: Request,
  maxBytes = 16384,
): Promise<Record<string, unknown>> {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json") ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AccessError(
      403,
      "invalid_origin",
      "This request must come from this website.",
    );
  }
  const reader = request.body?.getReader();
  if (!reader)
    throw new AccessError(400, "invalid_input", "The request is empty.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AccessError(413, "too_large", "The request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AccessError(
      400,
      "invalid_input",
      "The request is not valid JSON.",
    );
  }
  if (data === null || typeof data !== "object" || Array.isArray(data))
    throw new AccessError(400, "invalid_input", "The request is not valid.");
  return data as Record<string, unknown>;
}

export type CompanySummary = {
  id: number;
  role: string;
  display_name: string;
  verification_status: string;
  city: string | null;
  province_state: string | null;
  country: string | null;
};
export function selectCompany(
  companies: CompanySummary[],
  saved: string | undefined,
): CompanySummary | null {
  return (
    companies.find((company) => String(company.id) === saved) ??
    companies[0] ??
    null
  );
}
// Mirrors the inspected private.current_user_company_id, used by safety RPCs.
export function defaultSafetyCompany(
  companies: CompanySummary[],
): CompanySummary | null {
  return (
    [...companies].sort(
      (a, b) =>
        Number(b.role === "owner") - Number(a.role === "owner") || a.id - b.id,
    )[0] ?? null
  );
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function errorResponse(error: unknown): Response {
  if (error instanceof AccessError)
    return json(
      { error: error.message, code: error.code, redirect: error.redirect },
      error.status,
    );
  // Do not log/serialize SDK responses, tokens, credentials, or private records.
  return json(
    {
      error: "Unable to complete this request. Please try again.",
      code: "request_failed",
    },
    503,
  );
}

export function verifiedCallbackFlow(
  rawCookie: string | undefined,
  state: string | null,
  now = Date.now(),
): "signup" | "recovery" | "email_change" | null {
  if (!rawCookie || !state) return null;
  try {
    const value: unknown = JSON.parse(rawCookie);
    if (!value || typeof value !== "object") return null;
    const flow = value as {
      state?: unknown;
      flow?: unknown;
      expires?: unknown;
    };
    if (
      typeof flow.state !== "string" ||
      flow.state !== state ||
      typeof flow.expires !== "number" ||
      flow.expires <= now ||
      (flow.flow !== "signup" &&
        flow.flow !== "recovery" &&
        flow.flow !== "email_change")
    )
      return null;
    return flow.flow;
  } catch {
    return null;
  }
}
