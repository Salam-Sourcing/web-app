# Flutter/web parity recheck after corrections — 2026-10-06

**Latest code status:** subsequent S01–S07 findings are also implemented and
locally verified. See [functional corrections](functional_parity_fixes_2026-10-06.md)
for those changes, shared limits and remaining live acceptance. The corrections
below retain the history of the earlier R findings.

**The recheck's code defects are now corrected and locally verified.** See
[implementation and verification](parity_recheck_fixes_2026-10-06.md).
R01/R02/R03/R06/R07/R08 are implemented; R05 has richer bounded diagnostics with
local receipt verification. Production alert delivery/retention and live device
acceptance remain open. Browser push stays deferred. Full live 1:1 parity is not established.

The findings and scope below preserve the **original read-only recheck** before
these corrections. All 37 Flutter screens have a
corresponding web business workflow. This recheck found additional notification
navigation gaps, two small MFA/photo controls missing on web, and three Flutter
notification/inbox defects. Browser push remains explicitly deferred. Browser
diagnostics also remain less capable than native Crashlytics.

This report supersedes the original audit's outstanding-work summary, not its
historical evidence. The earlier W01–W11/C01–C05 corrections remain implemented;
their original observations below are historical; use the linked correction report for current status.

## Scope and evidence

- Inspected the current working trees, including the uncommitted corrections,
  across all 37 Flutter screens, 21 repositories, supporting state/widgets and
  service integrations, web routes, action handlers and shared contracts.
- Reviewed smaller controls and field options as well as major screens:
  enrollment keys, photo recovery, saved records/searches, quote terms and
  comparison, verification documents, team permissions, billing, support,
  exports, notification destinations and company selection.
- Refreshed the RPC inventory: **56 shared names**, two native-only names and
  four web-only names after accounting for dynamic wrappers and block/unblock.
  Calls in disabled integration scaffolding are included in this inventory;
  their presence does not mean a deployed feature works.
- Read hosted function metadata/definitions only in project
  `stjtdlwonexcgnhmgfqw`. The three new query helpers are installed, invoker
  functions, executable by authenticated users and denied to anonymous users.
  Native push registration/test functions exist; `register_web_push_token` does
  not. Hosted `private.panel_notify` creates account notices with `data.case_id`
  and no entity ID. No customer records, credentials or live mutations were used.
- Ran nine existing web parity/notification-target tests: all passed. Those
  tests omit the newly identified support/verification destinations.
- Ran isolated web resolver diagnostics with synthetic owned notifications:
  support-case and company-verification notices both resolve to the notification
  center instead of the corresponding task.
- Ran an isolated Flutter diagnostic against the actual repositories/state with
  mocked HTTP and synthetic complete datasets: 1,002 messages and 101 notices.
  The mock applies the client's requested limits. It reproduced incorrect inbox
  previews/unread counts and the notification badge count. Its assertions confirm
  the defects; a passing diagnostic is not a passing feature acceptance test.
  Temporary evidence: `/private/tmp/salam-postfix-inbox-audit.log`.
- This pass changed documentation only. It did not change application code,
  Flutter source, database schema, push rollout, invitation email or releases.

Native source paths below start with `lib/` in the sibling
`Salam-Sourcing-Marketplace-App` repository. Web source starts with `src/` here.

## Additional web gaps

### R01 — Notification destinations are incomplete

**Priority: functional parity. Backend change: none identified.**

Flutter `marketplace_home_shell_screen.dart:184` opens Support requests when an
owned notification contains `data.case_id`. The current hosted
`private.panel_notify` actually emits this notice format. Web
`src/pages/account/notifications.astro` and `src/scripts/notifications.ts:58`
only offer Open update when both `entity_type` and `entity_id` exist. Thus these
support notices have no Open action. The resolver at
`src/lib/server/notification-target.ts:23` does not fetch `data` and would return
the notification center anyway. Users can manually navigate to Support requests,
but the native notification-to-task action was not ported.

Flutter also handles `company_verification` notifications by resolving the
verification's company and opening its profile. Web has no matching resolver
branch and falls back to the notification center. The current hosted notification
RLS helper explicitly authorizes this entity type. The prevalence of existing
notifications with this type was not queried; current review functions were not
observed generating this format, so this is supported-record compatibility,
not a claim about the frequency of failed notices today.

Required: add the support action in both SSR and automatic updates; resolve the
owned notice, use only a validated destination, and retain recipient-company,
membership and record checks. Map authorized verification records to their
company profile. Never use notification `link_url` or arbitrary JSON as redirect
authority. Test support notices with no entity ID, verification notices, deleted
records, revoked membership and another company selected.

Flutter also contains a `listing_review` branch. The inspected hosted RLS helper
does not authorize that entity type. Do not call that a working native feature
missing on web or relax RLS to make a dormant branch reachable. Normal `listing`
notices are mapped on web.

### R02 — MFA setup key lacks native reveal/hide and copy controls

**Priority: interaction/privacy parity. Backend change: none.**

Flutter `two_factor_screen.dart:51,252–289` masks the setup key initially,
supports Show/Hide and supplies Copy setup key with feedback. Web
`src/pages/account/security.astro:65,163` prints the secret directly and supplies
neither control. QR normalization/manual entry are already fixed; this is a
separate, smaller omission.

Required: initially concealed key with accessible reveal/hide and copy/manual
fallback. Keep the secret out of logs, URLs, analytics and persistent client
storage. Verify cancellation/navigation/private-boundary cleanup. Masking is a
presentation precaution, not an additional authorization boundary.

### R03 — Chat photo retry requires leaving the viewer

**Priority: small usability parity. Backend change: none.**

Flutter `message_photo_screen.dart:28,65` offers Retry photo inside its failed
viewer. Web `src/scripts/chat-image-viewer.ts:183–188` tells the user to close
and reopen or download. Web zoom/pan/reset/gallery are already implemented and
are not missing. Recovery is possible, but the native in-viewer retry action is
absent.

Required: an explicit retry control that retries the authorized image request,
reports loading/failure and respects current private workspace access. Retry
must not revive a dismissed viewer after logout or a company/access change.

### R04 — Background browser push is deferred

**Priority: deferred by the user. Backend rollout required when resumed.**

Native has device enable/disable, registration, test delivery and background
notification opening. Web scaffolding remains disabled and needs public Firebase
configuration/VAPID, the prepared token migration and delivery rollout. Hosted
metadata was rechecked: the web registration RPC is still absent. In-app web
notifications and their global unread bell do work independently of browser push.

### R05 — Browser diagnostics are not equivalent to native crash reporting

**Priority: operational follow-up; no marketplace action is missing.**

Flutter `lib/core/services/crash_reporting_service.dart` reports sanitized code
locations, error type and fatal/nonfatal information to Crashlytics when enabled.
Web `src/scripts/client-errors.ts`, `src/lib/client-errors.ts` and
`src/pages/api/client-error.ts` accept only two error categories, at most three
signals per page with a 30-second interval. This provides an initial signal, but
no comparable diagnostic stack, crash grouping or confirmed alert pipeline.

Required: decide and verify privacy-preserving production error grouping,
sanitized code locations, retention and alert receipt. Native production receipt
also remains an acceptance task. Do not collect user text, tokens or private
record URLs to obtain richer diagnostics.

## Flutter defects found during the same comparison

### R06 — Conversation notifications cannot select another authorized company

**Priority: functional regression. Backend change: none identified.**

Flutter `marketplace_home_shell_screen.dart:131–164` opens both push and in-app
conversation notices by searching `fetchConversations()` for the currently
selected company. Since the repository now correctly scopes that inbox to the
selected company, a notice for another company is not found and shows unavailable.
This handler neither looks up the target conversation directly nor switches to
an authorized participating company. Both notification entry paths share it.

Web in-app navigation uses the owned notice's `recipient_company_id`, validates
membership, resolves the conversation and selects the appropriate company in
`src/lib/server/notification-target.ts:35–49`. Browser push remains deferred.

Required: directly resolve the RLS-visible target, validate current membership and
select an authorized participating company before opening. Preserve the current
company when it is an eligible party. Test open/archived threads, foreground and
cold launch, removed membership and users belonging to both parties. Do not load
every conversation to navigate to one ID. This finding is source-confirmed; a
real device/push reproduction has not been performed.

### R07 — Flutter inbox previews/search/unread counts use a shared 1,000-message sample

**Priority: correctness at scale. Existing search RPC can support a fix.**

`lib/data/repositories/messages_repository.dart:83–91` loads the latest 1,000
messages across all listed conversations, then derives each conversation's
preview and unread count from that sample. A single busy thread can consume the
entire sample. Other threads can show an RFQ title as their preview and zero
unread despite having an unread message; latest-preview search can miss them.
Unread counts within the busy thread are also truncated.

The diagnostic used 1,001 unread messages in one thread and one older unread
message in another. The actual repository returned 1,000 and zero unread,
respectively; the second preview was the RFQ title instead of its message.

The conversation query also has no explicit pagination, so the server's row cap
can omit later conversations. Web pages conversations with `search_conversations`,
gets their actual latest visible messages, and calculates exact per-thread unread
counts (`src/lib/server/procurement.ts:377–456`).

Required: page the company-scoped inbox and search before paging; use the actual
latest message and exact unread counts for each returned conversation. Retain
RLS, archived views and selected-company scope. Batch counts if needed rather
than making an unbounded client download. Add busy-thread and later-page fixtures.

### R08 — Flutter notification badge omits older unread notices

**Priority: notification correctness. Backend change: none identified.**

`lib/data/repositories/notifications_repository.dart:22` returns the newest 100
notices. `lib/presentation/state/notifications_state.dart:19` counts unread only
within those rows. If the newest 100 are read and an older one remains unread,
the global badge reports zero and Notifications' Mark all read is disabled.

The actual repository/state diagnostic reproduced zero from a 101-notice
fixture with one older unread notice. Web calculates an exact authorized unread
count independently of its 100-row display window in both SSR and
`src/pages/api/notifications.ts`.

Required: maintain an independent exact unread count and handle refresh/read/
delete consistently. Add a latest-100-read/older-unread regression fixture.

## Current screen coverage

“Implemented” below means a corresponding business workflow exists in source.
It is not a claim that every role/device/failure scenario passed live acceptance.
Screen names omit `lib/presentation/screens/` and `.dart`.

| Flutter screen                     | Current web equivalent                             | Recheck                                                                                                          |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supabase_bootstrap_screen`        | Middleware, `/auth/access`, `/auth/mfa`            | Implemented; live boundary matrix open                                                                           |
| `auth_screen`                      | Login, signup, email verification, forgot password | Implemented, including password visibility                                                                       |
| `reset_password_screen`            | Callback, `/account/password`                      | Implemented; recovery and reauthentication                                                                       |
| `two_factor_screen`                | `/auth/mfa`, `/account/security`                   | QR/verify/remove/cancel implemented; R02 controls                                                                |
| `marketplace_home_shell_screen`    | `AppLayout`, main navigation/company selector      | Implemented, including unread bell; R06/R08 native defects                                                       |
| `discovery_home_screen`            | `/discover`, public `/` preview                    | Search, populated categories, all native filter dimensions and sort implemented                                  |
| `listing_detail_screen`            | `/listings/[id]`                                   | Images, specs, supplier/save/contact/report/view recording implemented                                           |
| `public_company_profile_screen`    | `/suppliers/[id]`, reviews                         | Information, website, listings, reviews/save/contact/report/block implemented                                    |
| `saved_marketplace_screen`         | `/saved`                                           | Listings/suppliers and safe unavailable removal implemented                                                      |
| `company_onboarding_screen`        | `/company/new`                                     | Identity/type/contact/address and representation confirmation implemented                                        |
| `company_profile_screen`           | `/company`, edit                                   | Profile and verification evidence/retry/submit implemented                                                       |
| `sell_screen`                      | `/sell`                                            | Own status views, creation and insights navigation implemented                                                   |
| `create_listing_screen`            | `/sell/new`, edit                                  | Product/service, specs, images, units/lead/origin/pricing, draft/review implemented                              |
| `manage_listing_screen`            | `/sell/[id]`                                       | Edit, moderation reason/resubmit, pause/resume/archive implemented                                               |
| `enquiries_screen`                 | `/enquiries`                                       | All/Mine/Saved, search/status/category/urgent, save/create implemented                                           |
| `create_enquiry_screen`            | New/edit RFQ                                       | Draft/review, audience/currency/location/deadline/attachments implemented                                        |
| `direct_enquiry_screen`            | Supplier/listing preselected enquiry form          | Subject/message/quantity/unit/currency and private send implemented                                              |
| `enquiry_detail_screen`            | `/enquiries/[id]`, `/quotes/[id]`                  | Invite/close/cancel, quote lifecycle, attachments, deal/PDF navigation implemented                               |
| `submit_quote_screen`              | Enquiry quote form                                 | Currency/prices/nullable lead/payment/shipping/validity/notes implemented                                        |
| `quote_comparison_screen`          | Enquiry compare                                    | Ordering and quote fields/reviews/profile/selection implemented; verification presentation intentionally differs |
| `messages_screen`                  | `/messages`                                        | Search/open/archived/company scope implemented; R07 native defect                                                |
| `message_thread_screen`            | `/messages/[id]`                                   | Text/captioned attachments, retry ID/history/read/seen/report/live updates implemented                           |
| `message_photo_screen`             | Internal chat viewer                               | Embed/zoom/pan/reset implemented; R03 retry control                                                              |
| `buyer_dashboard_screen`           | `/enquiries/dashboard`                             | Counts, enquiry/deadline/deal navigation implemented                                                             |
| `deal_progress_screen`             | `/deals/[id]`                                      | Party milestones/dates/tracking/notes/history/documents/PDF implemented                                          |
| `marketplace_pdf_screen`           | Enquiry/deal export pages                          | Preview, authorized generation, share/download/open/print and retry implemented                                  |
| `account_settings_screen`          | `/account`, billing                                | Navigation, plans/change/cancellation/limits/invoice history/signout implemented                                 |
| `profile_information_screen`       | `/account/profile`                                 | Editable fields/email-change state and account metadata implemented                                              |
| `company_team_screen`              | Team/member pages                                  | Roles/custom permissions/join/invite/revoke/copy implemented; email locked off                                   |
| `accept_company_invitation_screen` | `/invite/[code]`, invitation review                | Authorized preview/accept and login continuation implemented                                                     |
| `notification_settings_screen`     | Preferences                                        | Six shared account preferences implemented; R04 browser push deferred                                            |
| `notifications_screen`             | Notification center                                | Read/all/delete/automatic freshness implemented; R01 destinations and R08 native count                           |
| `saved_searches_screen`            | Search list/detail                                 | Listing/RFQ matches, alerts/frequency/delete implemented; web additionally edits criteria                        |
| `supplier_insights_screen`         | `/account/insights`                                | Period metrics and listing views implemented                                                                     |
| `privacy_safety_screen`            | Safety, report/block, legal routes                 | Blocking, deletion/recovery-period cancellation and legal access implemented                                     |
| `support_requests_screen`          | `/account/support`, private JSON export            | Reply, appeals, ownership request and personal export implemented; R01 notice entry                              |
| `legal_document_screen`            | Terms/privacy/help                                 | Pages exist; production policy approval remains launch work                                                      |

RPC differences are accounted for: native `submit_listing_for_review` is reached
on web through `set_listing_status('submit')`; native/browser token registration
differs by platform. Web-only `get_marketplace_preview` supports anonymous cards;
`get_unavailable_saved_listings` replaces native saved-ID reconciliation;
`search_conversations` supports web's authorized paged inbox. These differences
are not four missing native screens or two missing web screens.

## Adaptations and acceptance limits

- Public browse/login prompting, marketing/plans/verification pages and SEO are
  intentional web additions. Web verification marks remain on company profiles
  per the user's instruction; reintroducing chat/card checks would be a regression.
- Native haptics, swipe/pull refresh, share sheets and secure storage correspond
  to browser controls, sharing/downloads, refresh and protected cookies. Native
  listing images do not have a zoom viewer; only chat-photo zoom was a port gap.
- Web supports any valid three-letter currency filter; native discovery offers
  CAD/USD/EUR/GBP plus all currencies. This is a native choice limitation, not a
  web omission. No normal saved-search path loading an unsupported currency into
  that native dropdown was found; do not claim an actual dropdown crash from it.
- Invitation email remains deliberately disabled in deployed source. A visible
  native Send email control is not evidence of a working native email feature.
- Neither current client provides checkout/cart, currency conversion, full chat
  history search, a persistent offline send queue or existing listing-image
  removal/reordering. They are not omitted ports.
- Equal security is an acceptance requirement, not established by this inventory.
  The shared backend enforces access/workflow guards, but live role removal,
  company switching, MFA/session revocation, private media/export cleanup and
  concurrent close/accept must be exercised on both deployed clients.
- No authenticated two-party staging or real-device session was available in
  this recheck. The original audit's complete acceptance matrix remains open;
  the prior local test/build evidence is recorded separately in the corrections
  report and was not presented as newly rerun full acceptance.

## Ordered remaining work

1. **Notification correctness:** R01 web destinations; R06 native company
   selection; R07 complete inbox previews/search/counts; R08 exact unread badge.
2. **Small interaction/privacy controls:** R02 key conceal/reveal/copy and R03
   photo retry, with accessible states/private cleanup. Add haptics to any new
   native tap controls per the user's AGENTS instruction.
3. **Live acceptance and monitoring:** production diagnostic receipt/routing and
   the full staging/device/role/cross-client matrix against deployed revisions.
4. **Deferred rollout:** browser push and invitation email only when resumed.

References: [original audit](flutter_web_parity_audit_2026-10-06.md),
[implemented corrections](client_parity_fixes_2026-10-06.md),
[remaining-work checklist](../remaining_work.md).
