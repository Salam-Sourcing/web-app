# Salam Sourcing web app

Astro server-rendered client for the same Salam Sourcing accounts and Supabase
backend as Flutter. The deployment adapter is Cloudflare.

## Current scope

Phase 1 provides public pages, registration/login/recovery, authenticator MFA,
protected account pages, company selection, reports, blocking and scheduled
deletion. Phase 2 adds company onboarding/profile editing, private verification
documents, seller drafts and moderation transitions, live discovery with filters,
listing/supplier detail pages and account-private saved items.
Phase 3 adds RFQs/direct enquiries, manual drafts/review/invitations, private
enquiry/message attachments, quote versions/comparison/acceptance/PDF exports,
and active/archived messaging with guarded live updates and duplicate-safe text
retries. Global navigation, company selection and page action spacing are corrected.
Phase 4 adds deal lists and buyer dashboard links, delivery milestones, private
immutable deal documents, separate party completion confirmations, verified
reviews/responses/reporting, and quote/deal PDF previews/downloads/sharing.
Messages now embed authorized image attachments inline with download links.
Phase 5 adds profile/email settings, teams/invitations/permission restrictions,
actual plans/invoices/change requests, in-app notifications/preferences, saved
searches, supplier insights, support replies/appeals/ownership requests and private
personal export. Phase 6 adds compatible website invitation links, Flutter key
alignment and a CI production smoke runner. Browser push code is prepared but
configuration and backend rollout are deferred; invitation email stays disabled.

Progress: [remaining_work.md](remaining_work.md).
Setup, database findings and acceptance: [Phase 1 notes](documentation/phase_1.md),
[Phase 2 evidence](documentation/phase_2.md), [Phase 3 evidence](documentation/phase_3.md),
[Phase 4 evidence](documentation/phase_4.md), [Phase 5 evidence](documentation/phase_5.md),
and [Phase 6 integrations and release gates](documentation/phase_6.md).

## Local development

Use Node 24 and the committed lockfile.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `SITE_URL=http://localhost:4321`.
3. Run `npm run dev` and open `http://localhost:4321`.

The example uses the shared backend, not a disposable database. It contains only
public/publishable configuration. Do not add service-role/secret keys. Real account
and safety actions affect real records; automated tests avoid those effects.
Keep CAPTCHA enabled against the shared backend. Its local/staging hostname
configuration still needs verification.

The current web widget site key is `0x4AAAAAAFO7STkIlGsSXpd_`. Login, signup and
recovery acquire a fresh challenge with their respective actions, pass the token
through the same-origin API to Supabase Auth, then reset/remove the widget before
retry. Supabase performs server-side Siteverify with the matching secret configured
under Authentication → Bot and Abuse Protection. Do not verify the same token
again in the web API: Turnstile tokens are single-use. No widget secret belongs in
the frontend or this repository.

The replacement widget now passes a real localhost challenge: Supabase reaches
credential validation for a deliberately nonexistent test account. An invalid
token still returns `captcha_failed`, confirming provider CAPTCHA remains enabled.
The earlier `invalid-input-secret` blocker is resolved. The raw IP host still
returns `110200`; the user confirmed mobile login works after the hostname URL
handoff. Live replay rejection remains pending. Flutter's source/build defaults
now match the replacement key; installed clients still require an updated release.

Mobile testing over a raw LAN IP can load the UI but may fail Turnstile before
password verification. This was reproduced at `192.168.1.229` with Turnstile
error `110200` (hostname not authorized). Use an authorized testing hostname
and configure the dev server to accept that exact host. Signup/recovery also
require the matching `SITE_URL` and Supabase callback allowlist. Login now
distinguishes hostname/configuration failures from retryable verification failures.

For phone testing on this Mac, the server can be started with:

```bash
npm run dev -- --host 0.0.0.0 --port 4321 --allowed-hosts karamullahs-mac-mini.local
```

On the same local network, try `http://karamullahs-mac-mini.local:4321/login`
if the device resolves this Mac's local network name. The shell resolved it during
HTTP checks, but the connected browser did not. The user subsequently confirmed
mobile login works after this hostname URL was provided.
Authorize `karamullahs-mac-mini.local` in the existing Turnstile widget's Hostname
Management first. This hostname is specific to this Mac; other developers should
use their own network hostname. No Cloudflare setting has been saved yet because
the connected browser requires account sign-in.

Auth uses host-only HttpOnly browser-session cookies, not localStorage. Closing
the browser may end the web session. Signup/recovery links must be opened in the
browser where they were requested.

## Checks

```bash
npm run check
npm test
npm run build
npm run test:release
```

With the dev server running, `npm run test:http` checks public pages, protected
routes, CSRF, CAPTCHA prerequisites, invalid callbacks and logout. It creates no
accounts, sends no emails and changes no business records.

For production policy checks:

```bash
npm run preview -- --host localhost --port 4322
SMOKE_URL=http://localhost:4322 SMOKE_PRODUCTION=true npm run test:http
```

Astro can run servers in the background. Stop them with `npm run dev -- stop`
or `npm run preview -- stop`.

## Deployment

Build with `npm run build`. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`TURNSTILE_SITE_KEY`, `AUTH_CAPTCHA_ENABLED=true` and
`SITE_URL=https://test.salamsourcing.com` as Cloudflare runtime bindings. Origin
mismatches fail closed. Astro's canonical site also uses the staging domain.

Verify Supabase redirect URLs/email templates and the Turnstile hostname before
enabling staging account flows. Preserve Flutter callbacks. Terms and Privacy
are visibly marked drafts awaiting approved content.

Initial Phases 1–3 reused the existing backend. The authorized
[concurrency follow-up](documentation/concurrency_fixes.md) applied shared guards
for attachment uniqueness, close/accept races and the five-image cap, and updated
both client codebases. Deploy web/build Flutter for the retry UX. Live
email/CAPTCHA/MFA and cross-client acceptance remain open. Messages use server-side
user-authorized Supabase Realtime relayed through a same-origin SSE endpoint;
the browser receives invalidations and fetches guarded records. Check streaming
and reconnect behavior on the actual Cloudflare deployment. PDF exports use
pdf-lib/fontkit with embedded Inter. See Phase 3 notes for the remaining
scale/export bounds.

Phase 4 reuses the existing hosted deal/review APIs and private `deal-documents`
bucket. It requires no new backend migration or Flutter changes. Browser-native
PDF printing and file sharing depend on browser support; download/open controls
remain available. Five-minute deal-document URLs stay valid until expiry, as in
Flutter. Live cross-client release acceptance remains pending.

Phase 5 reuses the current hosted account/support/export APIs. Email changes must
be confirmed in the originating browser; the actual secure dual-confirmation
provider flow still needs acceptance. Phase 6 browser push would require the
prepared additive migration followed by its matching sender deployment. Neither
was deployed in this continuation. Leave the Firebase public configuration blank
to keep enable/test controls disabled; see the Phase 6 rollout sequence before
enabling it. No service-account/private key belongs in web configuration.
