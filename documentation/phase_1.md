# Phase 1 — implementation and acceptance notes

Recorded **2026-10-05**. Code is implemented and locally verified. The phase's
live completion gate is **open**. This is not a deployment or full parity claim.

## Delivered

- Per-request Supabase SSR integration with the shared project, user JWTs,
  generated hosted types and pinned Supabase packages.
- Login/signup/confirmation, fresh Turnstile challenges, recovery/password updates,
  reauthentication nonce, TOTP enrollment/verification/removal/abandoned cleanup.
- MFA enforcement before private profile/company access, including restoration
  and recovery. Unsupported factor types fail closed.
- Profile readiness, fresh memberships and backend effective permissions.
  Account-scoped company selection is a checked preference, not authority.
- Reports, blocking and deletion through guarded RPCs. Deletion retains the
  30-day recovery period, DELETE confirmation and pending-only cancellation.
- Responsive five-destination shell and Account pages. Marketplace workflows
  remain in their planned phases.
- Landing, How it works, Help, draft policies, mobile menu, light login/dark dotted
  signup, current Flutter colors, bundled Inter and existing logo.
- CI for type checks, isolated tests and production build.

## Refreshed backend evidence

Read-only checks used **Salam Sourcing Backend**, project
`stjtdlwonexcgnhmgfqw`, healthy Postgres 17.11. No schema, business record,
deployed function or live configuration was changed.

The hosted snapshot is [database.types.ts](../src/lib/database.types.ts).
Nullable company-location fields are explicit in the domain type; generated RPC
return types alone do not capture SQL nullability.

The ten checked Phase 1 RPCs exist with `authenticated` execution and no `anon`
execution: `get_my_companies`, `get_company_permissions`, `ensure_current_profile`,
`request_account_deletion`, `cancel_account_deletion`, `file_complaint`,
`block_company`, `unblock_company`, `list_blocked_companies` and
`report_company_review`. Hosted source inspection established:

- `private.has_active_session` checks fresh MFA factors, existing/unexpired
  `auth.sessions`, anonymous-account exclusion and account restrictions.
- Profile RLS requires that helper and the user's own ID. Inactive/unavailable
  profiles cannot enter the workspace.
- Companies require active membership/account; effective permissions include
  backend role ceilings. Buy/Sell/Both is presentation only.
- Safety RPCs use `private.current_user_company_id`: active owned company first,
  lowest ID, otherwise lowest-ID active membership. They have no selected-company
  argument. The UI labels that default scope and refuses blocking when selection
  differs. Reports send exactly one authorized target.
- Backend deletion requests are serialized/idempotent and pending-only cancellable.
  Existing retention/anonymization rules are reused.

Public `/auth/v1/settings` confirms email authentication/signup enabled, email
confirmation required and anonymous/phone/external-provider sign-in disabled.
It does not establish delivery, redirect allowlists or CAPTCHA hostname settings.

### Migration drift and new Flutter account tools

Hosted history contains 17 versions, ending with:

| Migration              | Flutter local version | Hosted version                   |
| ---------------------- | --------------------- | -------------------------------- |
| Marketplace workflows  | 20261005144419        | 20261005153451                   |
| Procurement workflows  | 20261005161428        | 20261005180225                   |
| Saved-search scheduler | 20261005173224        | 20261005180252                   |
| Admin operations       | 20261005185937        | Not present in inspected history |

Flutter's newer `support_requests_repository.dart` calls `customer_support` and
`panel_customer_export`. Neither exists in the refreshed hosted function inventory.
Help uses the existing support email. In-app requests, appeals/ownership recovery
and paginated personal export remain blocked on shared deployment and are tracked
in Phase 5. Do not invent RPC results or replay migrations by filename order.
Reconcile history and deployed definitions before backend deployment.

The deployed invitation-email function retains an explicit disabled rollout lock,
defaults in source to `https://test.salamsourcing.com` and uses mobile invitation
links. Effective runtime environment was not inspected; rollout was not changed.

## Session and browser security

Each request has a separate server client. Cookies are host-only, HttpOnly,
SameSite=Lax and Secure on HTTPS. Auth/PKCE cookies last for the browser session.
The company cookie is a nonsecret account-scoped preference. No browser token
store or service-role client is used.

Callbacks require a matching one-hour HttpOnly flow cookie and random state.
PKCE exchange or a bound OTP token hash is supported; OTP type must match the
requested flow. Unsolicited implicit session fragments are rejected. Callback
pages strip displayed URL credentials, send no-referrer and restrict continuation
to normalized `/app` paths. Recovery still requires MFA.

Mutations require same-origin JSON, reject cross-site requests and bound bodies
to 16 KiB. Native validation, duplicate-submit guards, server checks and network/
challenge timeouts give useful failure states. Unknown SDK errors do not expose
secrets or claim simulated success.

Private/auth/API responses send browser/shared-CDN/Cloudflare no-store directives.
Production HTML preserves Astro-generated CSP hashes, allows scripts only from
self/Turnstile and disallows framing. Extend/recheck policy deliberately when
Realtime, private media or documents are implemented.

Fresh guarded session/company state is checked on focus, visibility, online
changes and periodically. Failed verification hides private content; changed
state discards/reloads it. BroadcastChannel covers logout/company changes.
Pagehide removes private DOM and persisted Back pages reload through guards.
Authenticated browser/CDN acceptance below is still outstanding.

Logout always clears local cookies. Remote revocation failure is reported honestly.
Later phases must add subscription, private-media and upload-cache disposal to
the same boundaries; those surfaces do not exist yet.

## Local evidence

- `npm test`: **30 passing isolated tests**. Coverage includes MFA before private
  reads, permissions, owned factors/cleanup, recovery/nonce, callback binding,
  CAPTCHA prerequisites, CSRF/body bounds, logout cookies, safety company scope,
  report targets and deletion confirmation/status. No live accounts are used.
- `npm run test:http`: **77 development HTTP assertions**.
- `SMOKE_URL=http://localhost:4322 SMOKE_PRODUCTION=true npm run test:http`:
  **95 production HTTP assertions**, including the complete generated CSP.
- `npm run check`: no errors/warnings; one Astro unused-variable hint on the
  callback redirect local. Build and callback rejection checks pass.
- `npm run build`: production Cloudflare build succeeds.
- Dependency install/audit after compatible updates: **0 known vulnerabilities**.
  React integration 7.0.0 and Cloudflare adapter 14.3.3 resolve the mixed-Vite
  development worker module-loading failure.
- In-app browser: public/home/login/signup/recovery navigation, mobile menu,
  native empty-form validation, signup at 320/390/1440 px without horizontal
  overflow and production form-script initialization.
- No real signup/recovery email, CAPTCHA solve, MFA change, company switch,
  report/block or deletion was submitted during verification.

## Staging configuration and live acceptance

### Mobile LAN login follow-up

- Reproduced the reported verification failure on `http://192.168.1.229:4321/login`
  with dummy credentials. Turnstile returned `110200` (domain not authorized),
  before any password verification.
- The form now explains hostname/key configuration errors and iframe connection
  failures instead of asking users to repeatedly retry a configuration problem.
  CAPTCHA remains enabled; no Supabase or Cloudflare settings were changed.
- Verification: the updated browser message includes the observed `110200`;
  all 93 tests pass and Astro check has no errors or warnings (one existing hint).
- Remaining: authorize a specific mobile-testing hostname in Turnstile and
  permit that exact host in the development server, then prove a real challenge
  and login on the phone. The user authorized Cloudflare access, but the connected
  browser is signed out, so the widget setting remains pending.
- Prepared `http://karamullahs-mac-mini.local:4321/login` with an explicit dev-server
  hostname allowlist. HTTP checks confirm this host returns 200 and an unrelated
  hostname returns 403. The local server listens on the Mac's network interfaces;
  phone access requires the same network and local hostname resolution.

### Existing widget integration follow-up

- Followed the provided [existing-widget instructions](https://developers.cloudflare.com/turnstile/spin/prompt.md).
  Reused `0x4AAAAAAFO6i1CV5cngCWrF`; updated `.env.example` and the ignored
  `.env.local`. No new widget or infrastructure was created.
- Supabase Auth is the existing server-side verification destination, per
  [its CAPTCHA integration contract](https://supabase.com/docs/guides/auth/auth-captcha).
  Tokens reach it through the guarded same-origin API. A second local Siteverify
  call would consume the same token before Supabase could verify it.
- Retain each form's widget through the protected submission, then reset/remove
  it in `finally`. Failed/expired/oversized/blank tokens stop submission; every
  retry acquires a new token. Loader failures remain retryable and cleanup errors
  cannot alter the Auth result.
- Validation: 99 tests pass, production build passes, Astro check has no errors
  or warnings (one existing hint), and 232 LAN HTTP smoke assertions pass.
  A deliberately invalid token is rejected by the live backend.
- Real browser evidence: the new key is served on the LAN login page; raw IP
  still returns `110200`. Localhost reaches the Auth handler but is rejected.
  Narrow, sanitized Auth-log queries found `invalid-input-secret` on that request.
  The user confirmed the provider was configured, but a valid matching secret
  still needs to be stored through the platform's secret-management flow.
- `karamullahs-mac-mini.local` returned 200 in shell HTTP checks, but the connected
  browser could not resolve it. Phone DNS/challenge/login remain unverified.
- Cloudflare is signed out in the connected browser. No secret was retrieved,
  displayed, rotated or written. No supported approved external Wrangler binary
  is available for the prompt's guarded secret-recovery flow. If recovery is
  required, confirm the canonical external binary/version and exact destination
  before any secret-bearing getter or write.
- Flutter still references the old key in `captcha_config.dart`, `.env.example`,
  `prepare-app-build.mjs`, its build-config test and Xcode CI defaults. Align those
  before releasing a client against the changed shared CAPTCHA provider; already
  installed builds using the old widget need a rollout plan.
- Remaining: valid matching provider secret, widget hostname authorization,
  Flutter coordination, and a fresh successful real request plus replay rejection.
  End-to-end validation is pending.

### Replacement widget after deletion

- The user deleted the previously integrated widget and supplied replacement
  site key `0x4AAAAAAFO7STkIlGsSXpd_`. Updated `.env.example`, ignored local
  configuration, README and remaining-work references. The prior subsection
  records evidence from the superseded widget; this key is now the active one.
- Re-fetched the existing-widget flow. Reused the replacement; no widget creation,
  secret retrieval, secret write or shared provider change was performed.
- Verified the running LAN login page serves the replacement key with CAPTCHA
  enabled. All six targeted CAPTCHA lifecycle tests and the production build pass.
- Real localhost challenge reaches the protected login handler, but Auth logs
  for the test still report `invalid-input-secret`. The replacement's matching
  secret needs to be saved in the existing Supabase CAPTCHA provider using its
  normal secret-management flow. The public site key cannot replace that secret.
- The raw IP address still returns client-side `110200`; hostname authorization
  is pending. The connected Supabase settings browser redirects to sign-in,
  and no callable connector exposes provider secret updates. Dashboard access is
  required to complete those settings. Fresh successful request/replay validation
  and phone hostname resolution remain pending.
- Flutter key/build coordination remains open as described above.

### Replacement widget retest after provider update

- At 2026-10-06 04:07 UTC, a fresh real challenge for the replacement widget on
  localhost passed server verification and returned `invalid_credentials` for
  the deliberately nonexistent test account. No real credentials were used.
- A separate request with an invalid token returned `captcha_failed`, confirming
  CAPTCHA remains enforced on the backend. The earlier invalid-secret blocker is
  resolved; no secret was retrieved or exposed by this verification.
- Retesting the raw LAN IP still returned `110200`. Phone hostname resolution,
  authorization, actual account login and replay rejection remain pending.

### User-confirmed mobile acceptance

- After the provider-secret retest and local hostname URL handoff, the user
  confirmed: "Works now." Record mobile login as user-confirmed acceptance;
  this supersedes the earlier pending mobile-login status above.
- Live token replay verification and Flutter widget/build alignment remain open.
  The raw IP address was not subsequently reported or tested as authorized.

### Domain and account acceptance

The user confirmed **test.salamsourcing.com** for staging. The future-domain
answer was `salamsourcimg.com`; confirm its exact production spelling before
changing origins/canonical metadata. Use staging now.

Configure the example values as Cloudflare runtime bindings. Override any local
build-time SITE_URL with the staging HTTPS origin. No callback trusts a
client-supplied origin.

- [ ] Verify Supabase Site URL/redirect allowlist for the staging callback, retaining
      `com.salamsourcing.marketplace://login-callback`. Web callbacks have `flow` and
      random `state` queries: use an origin-locked callback pattern supporting these
      and prove Supabase preserves them. Local use needs its localhost callback too.
- [ ] Verify confirmation/recovery templates preserve RedirectTo and support PKCE
      or bound OTP. Existing implicit/mobile templates cannot be assumed compatible.
- [ ] Verify Turnstile hostname/key and Supabase provider setup. Exercise fresh,
      expired/rejected and retry tokens. Keep shared CAPTCHA enabled.
- [ ] Test signup/confirmation/existing-account login on staging, profile readiness,
      incorrect credentials, confirmation-required accounts and rate limits.
- [ ] Test recovery with/without MFA, invalid/expired/different-browser links,
      password mismatch, nonce reauthentication and login with the updated password.
- [ ] Test authenticator enrollment/manual key/code, abandoned cleanup, restoration,
      removal and enrollment/removal from Flutter.
- [ ] Using controlled owner/member accounts, change company, membership,
      permissions, account status, MFA/session from Flutter/backend. Verify web loses
      access across direct links, reload, Back, multiple tabs and offline/reconnect.
- [ ] With controlled records, verify reporting, default-company blocking and
      deletion status/cancellation without affecting unrelated companies.
- [ ] Verify deployed cookie flags/refresh, response headers and actual Cloudflare
      cache rules. No rule may override no-store for private/cookie responses.
- [ ] Complete signed-in desktop/mobile/keyboard acceptance, dock and company
      controls. Public layouts alone do not verify private screens.
- [ ] Replace draft summaries with approved policies and define acceptance
      version/timestamp handling.
- [ ] Reconcile migration history before automated deployments; verify missing
      support/export APIs before implementing those account features.

Core Phase 1 needed no marketplace schema change. Browser push and eventual
invitation-email links retain narrow backend/configuration work in Phase 6.

### Flutter key alignment follow-up — 2026-10-05/06 UTC

The replacement public widget key is now also the Flutter CAPTCHA default, local
build fallback and Xcode Cloud fallback. Example configuration and Auth runbook
match. Two build-configuration checks and the current 95-test Flutter suite pass.
Installed clients still need a new release; source alignment does not update their
embedded widget. Real signup/reset/email-change and final domain rollout remain
in the launch acceptance checklist.
