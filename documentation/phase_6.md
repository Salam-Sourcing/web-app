# Phase 6 — integrations and release acceptance

Source implementation and local verification completed 2026-10-05/06 UTC.
Browser push configuration and rollout are deferred at the user's request.
Invitation email remains deliberately disabled. Full launch acceptance is open.

## Flutter alignment and invitation links

Flutter's CAPTCHA source/build defaults and Xcode Cloud fallback now use the
working shared public key `0x4AAAAAAFO7STkIlGsSXpd_`. The example and runbook were
updated. Installed clients still require a new build/release; changing the shared
Auth secret does not update their embedded old key.

Website `/invite/:uuid` links continue through login/signup/MFA into the authorized
company/role preview. Flutter accepts exact HTTPS invitation paths on staging,
production and www, rejecting HTTP, foreign hosts, user info, unexpected ports,
extra path segments, query strings, fragments and invalid IDs. Existing custom
scheme/manual-code acceptance remains compatible. Flutter shows/copies the
website link with haptic feedback on the added tappable text.

The prepared invitation email includes website and app links. Hosted version 2 is deliberately locked off; this follow-up did not redeploy
or enable the sender. HTTPS parsing does not itself configure
iOS universal links, Android app associations or deferred installation; opening
the website remains the supported fallback until those are deliberately added.

## Browser push — prepared, disabled and undeployed

The web preference page requires complete public Firebase/VAPID configuration
before enable/test controls become available. Notification permission is asked
only after an explicit user action on a supported HTTPS browser. Public config
belongs in the documented environment variables; service-account credentials
remain server-side.

The prepared backend extension lives in the Flutter/shared-backend repository:

- `supabase/migrations/20261006042422_web_push_registration.sql`
- `register_web_push_token` and service-role-only `get_web_push_delivery`
- `supabase/functions/send-message-push/push_payload.ts` and sender integration
- `supabase/tests/web-push-checks.mjs` and payload regressions

It adds explicit web registrations with an allowlisted HTTPS origin. Android/iOS
registrations remain explicit and use their existing API/payload; the mobile
delivery RPC's return contract is unchanged. Web origins are mandatory for web
tokens and absent for mobile tokens. Guards preserve current account/session
ownership, revocation, preferences, blocking, recipient validation, rotation and
own-token removal. These changes have **not been applied to the hosted backend**.

Web delivery uses a short-lived data-only FCM payload. Before display and again on
click, the service worker checks the stored own notification against the current
cookie session through `/api/push/validate`. Offline/logged-out/stale or mismatched
recipients receive no notification. The displayed title/body are generic, with no
private message/file/company content. Clicks go through the authorized exact-record
resolver rather than trusting payload links. Logout removes the owned registration
and clears visible notifications/local enable state across tabs.

The Firebase SDK is bundled and CSP allows only the necessary registration/FCM
origins. The current SDK retains deprecated token compatibility methods; the
shared sender still sends FCM v1 tokens. A future SDK registration-ID migration
must update the delivery contract together rather than replacing only the client.

Firebase's unused Firestore dependency brought an older gRPC package into the
lockfile. A pinned `@grpc/grpc-js` override to 1.14.5 removes the dependency audit
findings; `npm audit` reports zero vulnerabilities. This project does not run a
gRPC server. See the [maintainer's patched-version advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j).

### Future rollout sequence

1. Supply the Firebase web public config/VAPID key and verify the intended HTTPS
   domains and server Firebase project match. Keep browser push off meanwhile.
2. Reconcile the new migration with hosted history and apply the additive migration.
3. Deploy the matching sender only after both delivery RPCs exist. Verify existing
   Android/iOS message delivery before enabling the web client.
4. Enable web settings on staging, then demonstrate foreground/background delivery,
   supported mobile/browser behavior, denied permission, rotation, logout,
   revoked sessions, multiple devices/tabs and exact authorized destination taps.
5. Record recipient delivery before claiming readiness. Invitation-email rollout
   is separate and retains its own verified sender/activation requirements.

## Regression and layout evidence

- Web behavioral tests cover account scope/role boundaries, invitation handling,
  support versions, private export bounds, notification ownership/destinations,
  CAPTCHA callbacks and worker logout/recipient privacy.
- The release runner starts a built production preview, exercises public/private
  routes, no-store headers, CSP, logged-out API rejection and cross-origin mutation
  rejection, then stops its preview. CI now runs check, tests, build and this runner.
- Latest parity follow-up: 137 web tests; Astro check with zero errors/warnings
  (six existing hints); successful production build; 378 production HTTP assertions.
- Flutter: clean analysis and all 120 tests passing, including native form/layout,
  PDF retry and selected-company chat regressions.
- Shared backend: 406 isolated database assertions and nine push/email handler
  tests passing. No real recipient delivery is inferred from these checks.
- New account surfaces were inspected with labelled fixture controls and no
  document overflow at 320/390 and desktop 1280 pixels. RTL/enlarged root-text
  billing also fits. This does not replace the full accessibility/device matrix.

Current non-deferred corrections and the applied invoker-query migration are
recorded in the [parity correction report](client_parity_fixes_2026-10-06.md).
The original viewport checks above predate this follow-up; its new interaction
fixtures provide desktop evidence, with native widget layout checks separately.

## Shared launch dependencies

The hosted `private.panel_permission` definition now requires an active session,
AAL2, a verified TOTP factor, confirmed administrator email/metadata, current staff
membership and an effective panel permission. `panel_require` and `is_admin`
delegate to that guarded contract. The older Flutter checklist's claim that this
central backend gate was absent is stale. Fresh full privileged-operation
acceptance with real staff identities remains required.

Still required: two-account web/Flutter workflow acceptance and access revocation;
real signup/recovery/email-change delivery and final domain configuration; final
reviewed policies/acceptance records; target-device accessibility and release
builds; mobile signing/store preparation; real backup/restore and monitoring/crash
delivery; approved billing/accounting and admin frontend acceptance. These require
current environment evidence, not only passing local tests.

See the complete [remaining work checklist](../remaining_work.md). This phase is
not marked launch-complete while those acceptance gates remain open.
