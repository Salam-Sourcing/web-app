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
Deal fulfillment, insights and remaining account tools are in later phases.

Progress: [remaining_work.md](remaining_work.md).
Setup, database findings and acceptance: [Phase 1 notes](documentation/phase_1.md),
[Phase 2 evidence](documentation/phase_2.md) and [Phase 3 evidence](documentation/phase_3.md).

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

Auth uses host-only HttpOnly browser-session cookies, not localStorage. Closing
the browser may end the web session. Signup/recovery links must be opened in the
browser where they were requested.

## Checks

```bash
npm run check
npm test
npm run build
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
