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
