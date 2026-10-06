import assert from "node:assert/strict";
const origin = new URL(process.env.SMOKE_URL ?? "http://localhost:4321").origin;
const request = async (path, options = {}) =>
  fetch(origin + path, { redirect: "manual", ...options });
let count = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  count++;
};
for (const path of [
  "/",
  "/about",
  "/platform",
  "/plans",
  "/verification",
  "/help",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
]) {
  const response = await request(path);
  check(response.status === 200, path + " renders");
  check(
    response.headers.get("x-content-type-options") === "nosniff",
    path + " has nosniff",
  );
  const policy = response.headers.get("content-security-policy") ?? "";
  check(policy.includes("frame-ancestors 'none'"), path + " prevents framing");
  if (process.env.SMOKE_PRODUCTION === "true") {
    check(
      policy.includes("default-src 'self'"),
      path + " preserves Astro's full production CSP",
    );
    const scriptPolicy =
      policy.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    check(
      scriptPolicy.includes("https://challenges.cloudflare.com") &&
        !scriptPolicy.includes("'unsafe-inline'") &&
        !scriptPolicy.includes("'unsafe-eval'"),
      path + " restricts scripts while permitting CAPTCHA",
    );
  }
  const body = await response.text();
  check(body.includes("/fonts/Inter.ttf"), path + " loads Inter");
  if (
    ["/login", "/signup", "/forgot-password", "/verify-email"].includes(path)
  ) {
    check(
      response.headers.get("cache-control")?.includes("no-store"),
      path + " prevents caching",
    );
    check(
      response.headers.get("cloudflare-cdn-cache-control") === "no-store",
      path + " prevents Cloudflare caching",
    );
    check(
      response.headers.get("x-robots-tag")?.includes("noindex"),
      path + " prevents indexing",
    );
  }
}
for (const path of [
  "/account",
  "/account/profile",
  "/account/team",
  "/account/team/00000000-0000-4000-8000-000000000010",
  "/account/billing",
  "/account/notifications",
  "/account/preferences",
  "/account/support",
  "/account/searches",
  "/account/searches/1",
  "/invitations/00000000-0000-4000-8000-000000000020",
  "/notifications/1",
  "/discover",
  "/account/security",
  "/account/safety",
  "/account/password",
  "/saved",
  "/company",
  "/company/new",
  "/company/edit",
  "/sell",
  "/sell/new",
  "/sell/1",
  "/listings/1",
  "/suppliers/1",
  "/enquiries/new",
  "/enquiries",
  "/enquiries/1",
  "/enquiries/1/edit",
  "/enquiries/1/quote",
  "/enquiries/1/compare",
  "/quotes/1",
  "/messages",
  "/messages/1",
  "/account/insights",
  "/deals",
  "/deals/1",
  "/deals/1/export",
  "/enquiries/dashboard",
  "/enquiries/1/export",
  "/suppliers/1/reviews",
]) {
  const response = await request(path);
  check(response.status === 303, path + " rejects unauthenticated access");
  check(
    response.headers.get("location")?.startsWith("/login?next="),
    path + " keeps login continuation",
  );
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    path + " protects redirect caching",
  );
}
for (const path of [
  "/app/account",
  "/app/messages/1",
  "/app/listings/1",
  "/app/discover?query=steel&category=Metal",
  "/app/invitations/00000000-0000-4000-8000-000000000020",
]) {
  const response = await request(path);
  check(
    response.status === 308,
    path + " redirects permanently to the clean URL",
  );
  check(
    response.headers.get("location") === path.replace("/app", ""),
    path + " retains the destination and filters",
  );
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    path + " keeps legacy redirects private",
  );
}
const searchRedirect = await request(
  "/discover?query=steel&max_price=20&code=secret",
);
check(searchRedirect.status === 303, "guest filtered search requires sign in");
check(
  new URL(searchRedirect.headers.get("location"), origin).searchParams.get(
    "next",
  ) === "/discover?query=steel&max_price=20",
  "search filters survive sign-in without arbitrary parameters",
);
const browseHtml = await (await request("/")).text();
check(
  browseHtml.includes("data-public-search"),
  "homepage exposes editable search controls",
);
check(
  browseHtml.includes("data-login-prompt"),
  "homepage has the sign-in prompt",
);
check(!browseHtml.includes('href="/app/'), "homepage links use clean URLs");
const staleHome = await request("/", {
  headers: { cookie: "ss-auth=invalid" },
});
check(
  staleHome.headers.get("cache-control")?.includes("no-store"),
  "homepage auth-dependent responses are never shared-cached",
);
check(
  staleHome.headers.get("cloudflare-cdn-cache-control") === "no-store",
  "homepage auth-dependent responses bypass CDN caching",
);
const plansHtml = await (await request("/plans")).text();
check(
  (plansHtml.match(/class="card public-plan"/g) ?? []).length === 3,
  "plans page renders exactly three placeholders",
);
const sitemap = await request("/sitemap.xml");
check(
  sitemap.status === 200 &&
    sitemap.headers.get("content-type")?.includes("xml"),
  "public sitemap is available",
);
const sitemapXml = await sitemap.text();
check(
  sitemapXml.includes("/platform</loc>") &&
    sitemapXml.includes("/plans</loc>") &&
    sitemapXml.includes("/verification</loc>"),
  "sitemap includes public information pages",
);
check(
  !sitemapXml.includes("/messages") && !sitemapXml.includes("/listings"),
  "sitemap excludes login-protected records",
);
const robots = await request("/robots.txt");
check(robots.status === 200, "robots configuration is available");
const mutate = (path, data, headers = {}) =>
  request(path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
for (const path of [
  "/api/company",
  "/api/safety/delete",
  "/api/auth/mfa-enroll",
  "/api/auth/password",
  "/api/catalog/company-create",
  ...[
    "profile",
    "invite",
    "member",
    "permissions",
    "revoke-invitation",
    "accept-invitation",
    "billing",
    "preferences",
    "notification-read",
    "notifications-read",
    "notification-delete",
    "notification-open",
    "search-save",
    "search-delete",
    "support-reply",
    "support-appeal",
    "support-recovery",
    "export",
  ].map((a) => "/api/account/" + a),
  ...["register", "unregister", "validate", "test"].map(
    (a) => "/api/push/" + a,
  ),
  "/api/catalog/listing-create",
  "/api/catalog/listing-status",
  "/api/catalog/save",
  "/api/uploads/prepare",
  "/api/uploads/recover",
  "/api/uploads/remove-document",
  "/api/uploads/remove-enquiry",
  ...["advance", "complete", "review", "respond", "report"].map(
    (x) => "/api/deals/" + x,
  ),
  ...[
    "save-enquiry",
    "review",
    "invite",
    "close",
    "cancel",
    "saved",
    "quote",
    "accept",
    "reject",
    "withdraw",
    "send",
    "read",
  ].map((x) => "/api/procurement/" + x),
]) {
  const denied = await mutate(path, {
    company_id: 1,
    confirm: "DELETE",
    password: "not-a-real-password",
    confirm_password: "not-a-real-password",
  });
  check(denied.status === 401, path + " requires sign-in");
  const crossSite = await mutate(path, {}, { Origin: "https://other.invalid" });
  check(crossSite.status === 403, path + " rejects cross-site mutations");
}
for (const path of [
  "/api/catalog/search",
  "/api/media/listing/1",
  "/api/media/document/1",
  "/api/media/enquiry/1",
  "/api/media/message/1",
  "/api/media/message/1?inline=1",
  "/api/media/deal/1",
  "/api/deals/1/export",
  "/api/deals/1/export?preview=1",
  "/api/quotes/1/export?preview=1",
  "/api/messages/1",
  "/api/messages/stream",
  "/api/messages/conversations",
  "/api/quotes/1/export",
]) {
  const response = await request(path);
  check(response.status === 401, path + " requires sign-in");
  check(
    response.headers.get("cache-control")?.includes("no-store"),
    path + " cannot be cached",
  );
}
const upload = new FormData();
upload.set(
  "file",
  new File(["not-uploaded"], "test.txt", { type: "text/plain" }),
);
check(
  (
    await request("/api/uploads/attach", {
      method: "POST",
      headers: { Origin: origin },
      body: upload,
    })
  ).status === 401,
  "multipart upload requires sign-in",
);
check(
  (
    await request("/api/uploads/attach", {
      method: "POST",
      headers: { Origin: "https://other.invalid" },
      body: upload,
    })
  ).status === 403,
  "multipart upload rejects foreign origin",
);
const session = await request("/api/session");
check(
  session.status === 401,
  "session status fails closed without authentication",
);
const missingCaptcha = await mutate("/api/auth/login", {
  email: "fixture@example.invalid",
  password: "not-a-real-password",
});
check(
  missingCaptcha.status === 400,
  "login requires CAPTCHA before contacting Auth",
);
const callback = await request("/auth/callback?code=invalid&state=unsolicited");
check(callback.status === 200, "invalid callback shows recovery UI");
check(
  (await callback.text()).includes("invalid, expired"),
  "unsolicited callback does not establish a session",
);
const logout = await mutate("/api/auth/logout", {});
check(
  logout.status === 200,
  "logout clears local state even without a session",
);
const cookies = logout.headers.getSetCookie();
check(
  cookies.some(
    (cookie) =>
      cookie.startsWith("ss-auth=") &&
      /HttpOnly/i.test(cookie) &&
      (/Max-Age=0/i.test(cookie) ||
        /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i.test(cookie)),
  ),
  "logout clears HttpOnly auth cookies",
);
console.log(
  count +
    " HTTP smoke assertions passed at " +
    origin +
    ". No live account or business record was changed.",
);
