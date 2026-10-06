# Flutter/web parity audit — 2026-10-06

**Current code status:** W/C/R and S01–S07 corrections are implemented and locally
verified. See [latest functional corrections](functional_parity_fixes_2026-10-06.md)
and the remaining-work checklist for evidence, shared limits and open live gates.
Browser push remains deferred. The
findings below retain their original pre-fix context, with the chat coverage row
corrected where it previously overstated available actions.

**The baseline audit found confirmed web and Flutter parity defects.** The
non-deferred W01–W11 and C01–C05 corrections are now implemented and locally
verified in both repositories; the additive query migration is applied. See the
[corrections and verification report](client_parity_fixes_2026-10-06.md).
Browser push remains explicitly deferred. Full staging/device parity acceptance
is still open; completed screens and local tests do not close that gate.

The findings and source locations below describe the **pre-fix baseline**.
The ordered checklist records implementation progress separately from live acceptance.

## Original baseline and method

- Web: branch `1.0`, commit `4d7d14ad82b9980edcb603d2d5794bb601252853`.
- Flutter/backend: branch `1.0`, commit `a5b9703408e872e78acc1c6bff523117119a0431`.
- Inventoried all **37 Flutter screen files**, their supporting widgets/state,
  all **21 repository files**, service integrations, web routes, server actions,
  field payloads, media delivery and existing regression evidence.
- Compared RPC calls including dynamic repository wrappers and block/unblock
  branches. There are **55 shared RPC names**; each client has two additional
  names. Matching names is contract coverage evidence, not behavioral proof.
- Read-only hosted inspection used the configured project
  `stjtdlwonexcgnhmgfqw`: current quote/draft-edit function definitions, quote
  nullability/constraints, enquiry/quote triggers, selected function grants,
  RLS flags and deployed invitation/push function source. No customer rows,
  secrets or live mutations were needed.
- Ran 37 existing web auth/procurement/notification-target tests: all passed.
  Those tests do **not** catch every presentation or parity issue below.
- Ran two isolated Node diagnostics against current web code/installed SDK and
  four temporary Flutter widget diagnostics against the actual screens. The
  Flutter checks deliberately assert the discovered exceptions; their passing
  result confirms reproduction, not that the affected features work correctly.
- This was an assessment. No application code, database schema or live business
  data was changed. Unrelated uncommitted Android UI testing work was excluded.

Paths prefixed `lib/` below refer to the sibling Flutter repository. Paths
prefixed `src/` refer to this web repository. Findings identify source paths and
specific behavior so they remain actionable without this conversation.

This is a comprehensive source/contract audit of the current baseline, not a
claim that every runtime combination has passed. Authenticated staging journeys,
real device/browser layouts and permission changes during a live session still
need the acceptance matrix at the end.

## Confirmed missing or inconsistent web behavior

### W01 — Authenticator QR rendering is broken for the installed SDK

**Priority: fix first. Defect; manual secret entry remains available.**

Flutter's `lib/presentation/screens/two_factor_screen.dart:11` normalizes raw SVG,
Supabase's UTF-8 SVG data URL, percent-encoded data URLs and base64 data URLs.
Its QR format fixtures are covered in `test/two_factor_test.dart`.

Web `src/pages/account/security.astro:150` instead uses
`"data:image/svg+xml;base64," + btoa(factor.totp.qr_code)`.
`src/lib/server/auth-actions.ts` returns enrollment data unchanged. The installed
`@supabase/auth-js` implementation prepends `data:image/svg+xml;utf-8,` to the QR
SVG before returning it. Web therefore base64-encodes the entire data URL as
though it were SVG. Decoding the image payload yields `data:image/...`, not an
SVG document. This was reproduced with an SDK-shaped fixture, without enrolling
a real account.

**Required:** accept the actual SDK data URL and normalize supported formats
without double encoding. Keep manual entry and failed-image feedback. Exercise
the rendered QR in a browser, not only the enrollment server action.
**Backend change:** none identified.

### W02 — Global unread notification indicator and automatic updates

**Priority: functional parity.**

Flutter subscribes to the signed-in user's notification changes in
`lib/data/repositories/notifications_repository.dart:63`. Its home shell loads
that state and shows a notification bell with an unread count on all main tabs
(`lib/presentation/screens/marketplace_home_shell_screen.dart:387`).

Web has a working notification center, read/delete actions, preferences and
authorized entity links at `/account/notifications`. It fetches rows/counts on
page load and offers explicit reload through
`src/scripts/account.ts:123`. `src/layouts/AppLayout.astro` has no global bell or
unread count and there is no live notification-center subscription/polling.
Live chat/inbox updates **are** implemented and are separate from this gap.

**Required:** a global unread indicator and account-scoped fresh updates. Keep
the list stable while reading and preserve scroll/focus; do not restore the
blocking access overlay on normal interaction. This can be completed before
browser push. **Backend change:** no schema change identified; validate the
chosen authorized refresh/subscription mechanism against existing RLS.

### W03 — RFQ search omits requirements, buyer name and delivery location

**Priority: functional parity.**

Flutter `lib/presentation/state/enquiries_home_state.dart:150` matches title,
description/requirements, buyer name and location. Web
`src/lib/server/procurement.ts` in `enquiryFeed` applies `ilike` only to `title`.
A term found exclusively in the requirements, buyer or delivery location can
find an RFQ in Flutter and return no result on web.

**Required:** match the same search fields while retaining authorization,
company/tab scope, stable pagination and literal search escaping. Do not fix
this by filtering only the first returned web page.
**Backend change:** not necessarily; an additive search RPC may be appropriate
if existing authorized queries cannot combine these fields reliably/efficiently.

### W04 — Conversation search omits the latest message preview

**Priority: functional parity.**

Flutter `lib/presentation/state/messages_home_state.dart:72` matches the other
company's name **or the latest message preview**. Web `conversationFeed` in
`src/lib/server/procurement.ts` searches company names and enquiry titles, then
fetches latest messages after filtering. It does not search the preview.

**Required:** support latest-message-preview search and retain the existing
company/enquiry matches, archived view and selected-company restriction. Flutter
does not implement full historical message search; that is not this requirement.
**Backend change:** no new business data needed; choose an authorized query/RPC
that selects the actual latest visible message before applying the search.

### W05 — Unavailable saved listings cannot be removed from web

**Priority: functional parity.**

Flutter's `lib/presentation/screens/saved_marketplace_screen.dart` loads saved
IDs separately from visible listings. After loading the listing pages it shows
unavailable placeholders with a Remove action (`:236`).

Web `src/components/CatalogFeed.astro` renders only the visible rows returned by
`search_marketplace(saved=true)`. It has no corresponding listing placeholder
or removal control when an item becomes paused, private, blocked or unavailable.
The user can be left with a saved record they cannot remove through the UI.
Web unavailable **supplier** placeholders already exist through `savedSuppliers`;
they must not be confused with the missing listing handling.

**Required:** safely expose owned saved IDs as generic unavailable items and
allow removal without disclosing a hidden listing's title or other details.
Preserve pagination and avoid labeling an unloaded later page as unavailable.
**Backend change:** none identified; the existing removal action accepts an
owned saved listing without requiring the underlying listing to be public.

### W06 — Photo viewer lacks Flutter zoom, pan and reset

**Priority: usability parity.**

Both clients now embed chat photos and open an internal viewer. Flutter
`lib/presentation/screens/message_photo_screen.dart` offers `InteractiveViewer`
with 1–5× zoom/pan and Reset zoom. Web
`src/scripts/chat-image-viewer.ts` offers close, download, gallery navigation and
keyboard arrows, but no equivalent image zoom/pan/reset controls. Browser page
zoom is not the same ability to inspect a photo inside this viewer.

**Required:** accessible zoom/pan/reset with touch and desktop controls, keeping
the existing authorized media route and private-boundary cleanup.
**Backend change:** none.

### W07 — Legacy photos without attachment MIME metadata do not embed on web

**Priority: compatibility. Actual affected-row prevalence was not queried.**

Flutter `lib/data/models/message_conversation_model.dart:75` uses the stored
image MIME type and, only when absent, a JPEG/PNG/WebP filename fallback. The
legacy-photo fixture is tested in `test/message_photos_test.dart`.

Web `messageImage` in `src/lib/deals.ts:75` requires one of the three explicit
MIME strings. Both SSR (`src/components/MessageAttachment.astro`) and live
rendering (`src/scripts/messages.ts`) use it. A legacy `photo.JPG` with null MIME
can embed in Flutter but appears only as a download on web.

**Required:** compatible legacy detection without treating arbitrary filenames
as trusted browser content. Keep the media endpoint's authenticated download,
Storage MIME validation, `nosniff` and restricted inline image types.
**Backend change:** not required if safely inferred on the client/server; an
optional metadata repair must verify actual stored media rather than guessing.

### W08 — Web requires lead time that Flutter and hosted quotes allow to be empty

**Priority: functional parity.**

Flutter `SubmitQuoteScreen` treats lead time as optional and submits null when
empty. Web's quote form marks it required and `quotePayload` in
`src/lib/procurement.ts:156` calls `numberField(..., true, true)`.

A current-code diagnostic returns `400 invalid_input: Enter lead time days.`
for an otherwise valid quote with blank lead time. Hosted inspection confirms
`quotes.lead_time_days` is nullable, its constraint allows null, and
`submit_quote` inserts the nullable value. This is a client restriction, not a
database requirement.

**Required:** allow unspecified lead time with the same display/comparison
semantics, or deliberately change both clients' product rule together. Retain
non-negative integer validation when supplied. **Backend change:** none needed
to preserve current Flutter behavior.

### W09 — Personal account metadata panel is missing

**Priority: informational parity.**

Flutter `lib/presentation/screens/profile_information_screen.dart:383` displays
account status, email verification time, last login, creation time and update
time. Web `/account/profile` supports the editable fields and clearly shows
pending email changes, but it has no corresponding metadata panel.

**Required:** read-only presentation of the same available account fields,
with honest unavailable values and consistent timezone labels. Account status
must remain informational, never an editable input.
**Backend change:** none identified; the profile columns already exist.

### W10 — Password visibility control is missing where Flutter supplies it

**Priority: small interaction parity.**

Flutter signup and password-update screens have a Show/Hide password toggle
(`auth_screen.dart:995`, `reset_password_screen.dart:136`). Web
`src/components/AuthForm.astro` and `/account/password` use password fields with
no toggle. Flutter's existing login form itself has no visibility toggle; do not
claim this was a missing port of a native login feature.

**Required:** accessible toggles on signup/password update without changing
password bytes, autofill or validation. **Backend change:** none.

### W11 — One-click invitation copying is missing

**Priority: small interaction parity.**

Flutter `lib/presentation/screens/company_team_screen.dart:138` supplies Copy
website link and Copy code controls. Web `/account/team` renders readonly link
and code inputs that users can copy manually, but has no corresponding copy
buttons or success/failure feedback.

**Required:** clipboard actions with a usable manual fallback, including local
HTTP testing where browser Clipboard API availability differs.
**Backend change:** none.

### W12 — Background browser push remains deferred

**Priority: explicitly deferred by the user, not accidentally omitted.**

Flutter has device registration, enable/disable, test delivery and notification
opening. Web client/service-worker/server scaffolding exists, but rollout is
disabled and Firebase web configuration/public VAPID setup is still outstanding.
The hosted database currently has no `register_web_push_token` function, and
the deployed push function has the older native payload path. Prepared source
and generated TypeScript definitions are not evidence of hosted availability.

**Required when resumed:** apply the reviewed additive web-push migration;
deploy the prepared delivery payload; configure public Firebase/VAPID values;
test recipient/session binding, logout, account switching, foreground/background
delivery and deep links before enabling controls. Preserve Android/iOS delivery.
**Backend change:** yes, the planned browser-specific additive rollout is needed.
See [Phase 6](phase_6.md). Do not enable this while it remains deferred.

## Cross-client defects and differences that also need resolution

These are not features missing only from web. They matter because a task started
on one client must be continuable on the other.

### C01 — Flutter RFQ edits can overwrite web-entered country, currency and visibility

**Priority: fix first; data/visibility preservation.**

Web can create an RFQ with a chosen country, three-letter currency and
invited-supplier visibility. It preserves those fields on edit; web additionally
locks currency after creation in its server action.

Flutter `lib/data/repositories/enquiries_repository.dart:175` constructs the
draft update payload with `delivery_country: 'Canada'`, `currency: 'CAD'` and
the UI's `visibility: 'public'`. Its RFQ model/editor lacks the independent
country/currency/visibility fields. The hosted `update_enquiry_draft` function
**does update these values when supplied**; inspected enquiry triggers do not
make currency immutable. Therefore an edit of a permitted draft/rejected web
RFQ can overwrite these values. Delivery location is also reconstructed by
splitting a formatted string, rather than retaining the original separate
city/province/country columns.

**Required:** model and preserve all three fields, use structured location data,
expose compatible choices, and explicitly reconcile the currency edit rule
between both clients and the actual hosted contract. Add a web → Flutter → web
round-trip test for an invited USD RFQ delivered outside Canada. This requires
Flutter changes; do not silently narrow web to hide the incompatibility.

### C02 — Flutter listing editor cannot render some valid web field values

**Priority: fix first; reproduced with actual Flutter widgets.**

Web supports free-text units and arbitrary valid integer lead times. Flutter
copies stored values into dropdown initial values
(`create_listing_screen.dart:104–105`), but its options are restricted:

- Unit: `unit`, `kg`, `tonne`, `litre`, `case`, `pallet`, `hour`, `project`.
- Lead days: `1`, `3`, `7`, `14`, `21`, `30`, `60`, `90`.

Temporary widget checks confirmed the normal `unit`/7-day fixture renders, while
`carton`/7 and `unit`/10 fixtures trigger Flutter's dropdown assertion. In release
mode, assertions being disabled does not make an unmatched value a usable edit
choice. Preserve the stored choice and support valid custom values.

The model also omits listing currency while the editor's pricing/review labels
say CAD. Repository updates currently omit currency, so do **not** claim this
editor automatically changes the stored currency. It can mislabel a legacy
non-CAD listing; display the actual value.

**Backend change:** none identified for accepting/displaying existing values.

### C03 — Validation and quote-entry options differ between clients

**Priority: align before declaring round-trip parity.**

| Field/behavior               | Flutter                                             | Web                                             | Required decision/check                                             |
| ---------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Listing name length          | Input max 120                                       | Max 200                                         | Preserve and edit web-created names without forced shortening.      |
| Listing description          | Input max 1,500; minimum 20 characters              | Max 6,000; server permits shorter nonempty text | Align bounds or make editing compatible with all valid stored text. |
| Origin country               | Flutter editor requires it                          | Optional on web                                 | An otherwise valid web listing must remain editable in Flutter.     |
| RFQ title                    | Input max 120; minimum 5                            | Max 180; shorter nonempty text accepted         | Align bounds and existing-record handling.                          |
| RFQ requirements             | Input max 2,000; minimum 20                         | Max 8,000; shorter nonempty text accepted       | Test both short and long cross-client records.                      |
| Quote lead time              | Optional                                            | Required                                        | W08: preserve existing nullable rule.                               |
| Quote currency               | Submitted as CAD                                    | User enters currency; defaults to RFQ currency  | Flutter must respect RFQ/quote currency and label it correctly.     |
| Quote validity               | Automatically now + 30 days                         | Required user-entered future date               | Provide consistent defaults and preserve explicit choices.          |
| Quote payment/shipping terms | Displayed on comparison; not editable on submission | Editable on submission                          | Reverse parity gap: add Flutter inputs or document agreed scope.    |
| Marketplace currency filter  | All by default; four named currencies plus All      | All by default; any valid three-letter input    | No missing web capability; native options are narrower.             |

These are UI/form rules observed in source, not evidence that every upper-bound
record is automatically truncated. Acceptance must test editing existing values,
not only creating each client's happy-path defaults.

### C04 — Flutter PDF retry throws a framework assertion

**Priority: fix retry path. Reproduced in a temporary widget check.**

`lib/presentation/screens/marketplace_pdf_screen.dart:78` uses
`setState(() => _bytes = widget.buildPdf())`. The assignment expression returns
the Future; Flutter rejects Futures returned from `setState` callbacks. A
diagnostic with failed first generation and a Retry tap reproduced
`setState() callback argument returned a Future.`

**Required:** keep the callback synchronous with a block body, handle asynchronous
failure, and test a failed generation followed by successful preview/share.
This is an existing Flutter defect, not missing web PDF support.

### C05 — List scope/navigation differences need explicit acceptance

- Flutter's RFQ All tab includes published RFQs plus its own and direct supplier
  enquiries; web All is the public open feed. Web Mine includes owned/direct
  enquiries plus invitation/quote-related RFQs. Draft/direct/closed work must
  remain easy to find, and labels should explain the scopes.
- Flutter's conversation repository loads RLS-visible conversations across the
  user's companies; web scopes its inbox to the selected company. Web supports
  company switching and notification navigation selects the appropriate company.
  Verify that users with multiple companies can locate and continue every
  conversation; switching is an adaptation, not a missing message-send action.
- Check invitation/quote-related RFQs after publication/status changes; Flutter's
  feed query does not explicitly union invitation and supplier-quote IDs as web
  Mine does. Record the expected discoverability for still-authorized records.
- Flutter displays local timestamps; web business dates use explicit Mountain
  Time. Both can represent the same instant, but timezone/default behavior must
  be understood and tested around deadlines and daylight saving.

## Features accounted for across all Flutter screens

Screen names below omit the common prefix `lib/presentation/screens/` and suffix
`.dart`. “Present” means an implementation and matching business route/action
were found. It does not mean every device/role acceptance case has passed.

| Flutter screen                     | Web destination/implementation                                   | Assessment                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supabase_bootstrap_screen`        | Middleware, `/auth/access`, `/auth/mfa`, account-boundary script | Session/profile/MFA gates present; live boundary matrix open.                                                    |
| `auth_screen`                      | `/login`, `/signup`, `/forgot-password`, `/verify-email`         | Shared accounts, intent, CAPTCHA and confirmation; W10.                                                          |
| `reset_password_screen`            | `/auth/callback`, `/account/password`                            | Recovery, confirmation and nonce/reauthentication present; W10.                                                  |
| `two_factor_screen`                | `/auth/mfa`, `/account/security`                                 | Enroll/verify/remove/cancel present; W01 QR defect.                                                              |
| `marketplace_home_shell_screen`    | `AppLayout`, five destinations, multi-company selector           | Shell/context present; W02 global notification indicator.                                                        |
| `discovery_home_screen`            | `/discover` plus public `/` preview                              | Search/sort/populated category/price/MOQ/lead/location/verified filters and pagination present.                  |
| `listing_detail_screen`            | `/listings/[id]`                                                 | Gallery, details/specifications, supplier, save, direct enquiry, view recording and report present.              |
| `public_company_profile_screen`    | `/suppliers/[id]`, `/suppliers/[id]/reviews`                     | Company information, website, listings, reviews/save/contact/report/block present.                               |
| `saved_marketplace_screen`         | `/saved` listing/supplier tabs                                   | Save/remove visible items and unavailable suppliers present; W05 unavailable listings.                           |
| `company_onboarding_screen`        | `/company/new`                                                   | Shared company identity/address/contact/type creation present.                                                   |
| `company_profile_screen`           | `/company`, `/company/edit`                                      | Profile/verification state, upload/delete documents, retry and submit present.                                   |
| `sell_screen`                      | `/sell`                                                          | Own listing statuses, pagination, company setup and creation present.                                            |
| `create_listing_screen`            | `/sell/new`, edit form on `/sell/[id]`                           | Product/service, specs, price/MOQ/lead/origin/images, draft/review present; C02/C03.                             |
| `manage_listing_screen`            | `/sell/[id]`                                                     | Edit, moderation reason/resubmit, pause/resume/archive present.                                                  |
| `enquiries_screen`                 | `/enquiries` All/Mine/Saved                                      | Core views/filter/save/create present; W03/C05.                                                                  |
| `create_enquiry_screen`            | `/enquiries/new`, `/enquiries/[id]/edit`                         | Public/invited RFQ, draft/review and attachments present; C01/C03.                                               |
| `direct_enquiry_screen`            | `/enquiries/new?supplier=...&listing=...`                        | Private supplier/listing enquiry present.                                                                        |
| `enquiry_detail_screen`            | `/enquiries/[id]`                                                | Terms, attachments/remove, invite, quote actions, close/cancel, conversation/deal links present.                 |
| `submit_quote_screen`              | `/enquiries/[id]/quote`                                          | Submit/revise version present; W08 and C03 form differences.                                                     |
| `quote_comparison_screen`          | `/enquiries/[id]/compare`, `/quotes/[id]`                        | Price-per-currency/lead/newest comparison, terms, supplier/reviews, acceptance and exports present.              |
| `messages_screen`                  | `/messages` Active/Archived                                      | Live previews/unread/activity/pagination present; W04/C05.                                                       |
| `message_thread_screen`            | `/messages/[id]`                                                 | Text/photos/files/captions/history/read/retry, counterparty profile and incoming-message report present after S01–S03 corrections; report/block access remains on the profile. See the latest functional correction report. |
| `message_photo_screen`             | Internal chat photo dialog                                       | Embedded authorized images, close/gallery/download/error handling present; W06 zoom/pan/reset.                   |
| `deal_progress_screen`             | `/deals/[id]`, `/deals`                                          | Milestones, shared note/tracking/delivery, private documents/removal, history/completion/reviews/export present. |
| `marketplace_pdf_screen`           | Enquiry/quote and deal export pages/endpoints                    | Authorized PDF preview/download/share/browser print present; C04 native retry.                                   |
| `buyer_dashboard_screen`           | `/enquiries/dashboard`                                           | Company RFQ/quote/deal summary and links present.                                                                |
| `supplier_insights_screen`         | `/account/insights`                                              | 7/30/90-day aggregate/listing metrics present.                                                                   |
| `saved_searches_screen`            | `/account/searches`, `/account/searches/[id]`                    | Save/list/delete, listing/RFQ matches, alert toggle/frequency and 25-search limit present.                       |
| `company_team_screen`              | `/account/team`, `/account/team/[id]`                            | Invite/revoke/change/remove and owner custom permission restrictions present; W11; email deferred.               |
| `accept_company_invitation_screen` | `/invite/[id]`, `/invitations/[id]`, Account join flow           | HTTPS/manual code, identity/role/expiry checks and company switching present.                                    |
| `account_settings_screen`          | `/account`, `/account/billing`                                   | Personal/company navigation, active subscription/plans/change/cancel/history and logout present.                 |
| `profile_information_screen`       | `/account/profile`                                               | Name/email/phone/country update present; W09 metadata panel.                                                     |
| `notifications_screen`             | `/account/notifications`, notification target actions            | Read/all-read/delete/authorized destination present; W02 freshness.                                              |
| `notification_settings_screen`     | `/account/preferences`                                           | Shared preferences present; W12 browser push deferred.                                                           |
| `privacy_safety_screen`            | `/account/safety`, `/account/report`, `/account/block`           | Company blocks/unblocks, reports, deletion scheduling/cancellation/retention present.                            |
| `support_requests_screen`          | `/account/support`, `/api/account/export`                        | Support replies, versioned appeals, ownership-transfer requests and personal-data export present.                |
| `legal_document_screen`            | `/terms`, `/privacy`, `/help`                                    | Destinations present; production legal content/acceptance remain a shared release gate.                          |

## Repository/service contract coverage

| Flutter contract area                                     | Web counterpart/evidence                                                                                                                                                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth, auth UI, profile repositories                       | `auth-actions.ts`, `access.ts`, `AuthForm.astro`, profile action/page; W01/W09/W10.                                                                                                                                                                |
| Company profile, public profile, summaries, reviews, team | Catalog/account/deal server actions, company/supplier/reviews/team pages and shared RPCs.                                                                                                                                                          |
| Listings, seller listings, listing media                  | Catalog search/detail/actions, guarded media endpoint, listing forms/upload journals; C02/C03.                                                                                                                                                     |
| Enquiries, procurement, shortlist                         | Procurement actions/feeds, deals/dashboard/searches/permission pages, saved actions; W03/W05/W08/C01.                                                                                                                                              |
| Messages                                                  | Stream/API/history/merge/send paths, attachment upload intent and private viewer; W04/W06/W07/C05.                                                                                                                                                 |
| Notifications/preferences                                 | Account actions/pages, authorized target resolver and push scaffold; W02/W12.                                                                                                                                                                      |
| Account settings, insights, support, safety               | Billing/insights/support/export/block/report/deletion routes and shared guarded RPCs.                                                                                                                                                              |
| Secure native auth storage                                | HTTP-only web cookie/PKCE architecture is the platform adaptation; no plaintext persistent browser token store is required.                                                                                                                        |
| Upload cleanup service                                    | Immutable upload journals/ownership/reference-aware cleanup present on web. Validate uncertain-ack recovery across clients.                                                                                                                        |
| Invitation links                                          | HTTPS/manual acceptance implemented; native OS association is a separate deployment dependency.                                                                                                                                                    |
| Crash reporting service                                   | Native sanitized Crashlytics integration exists. No comparable browser client-error capture was found; Cloudflare server logs are not equivalent. Choose privacy-preserving web monitoring as operational follow-up, not a marketplace action gap. |
| Push service/recipient/token registration                 | Native implementation active; web prepared but deferred and not installed on hosted DB.                                                                                                                                                            |

RPC inventory reconciles the apparent differences:

- Flutter `submit_listing_for_review` is covered on web by
  `set_listing_status(p_action='submit')`, whose backend implementation delegates
  to that function. It is **not** a missing review-submit capability.
- `register_push_token` versus `register_web_push_token` is the native/browser
  integration split; web rollout remains missing/deferred.
- `get_marketplace_preview` is intentionally web-only for anonymous card access.
- Dynamic `ProcurementRepository.call(...)` accounts for dashboard, deal progress,
  saved searches and member permissions. Dynamic web block/unblock calls are
  covered too; literal-only grep would incorrectly list these as missing.

The shared backend provides account/session/MFA, role and effective permission,
company verification, subscription quotas, blocked-company and workflow guards.
Selected hosted business tables have RLS enabled. Those facts support reuse,
but neither matching RPC names nor an RLS flag proves complete authorization
equivalence for every live case.

## Intentional adaptations and shared limitations

- The public website preview/login prompt, `/platform`, SEO metadata and the
  three-placeholder `/plans` page are web additions requested by the user.
  Actual account billing uses backend plan/subscription records on both clients;
  `/plans` placeholders do not mean web billing is absent.
- Web verification checks are intentionally restricted to company profiles with
  explanation/Learn more, per the user's instruction. Flutter still shows checks
  elsewhere. Do not reintroduce web chat/card badges in the name of parity.
- Native haptics, pull-to-refresh, share sheets, secure storage and app links use
  appropriate browser controls, cookies, reload/refresh, Web Share/download and
  HTTPS navigation. A missing vibration is not a missing business capability.
- Web authenticated media is served through authorization checks; native often
  downloads bytes or opens short-lived signed URLs. Both must enforce current
  recipient/company access; they need not expose identical URL forms.
- Both current seller editors append images and retain existing cover/order.
  Flutter removes only newly selected pending images, not previously attached
  listing images. Existing-image removal/reordering is **not** an existing
  Flutter feature omitted from web. If desired, it is a shared product extension.
- Neither current client implements a shopping cart/instant checkout, currency
  conversion, full-history message search or a persistent offline message outbox.
  Do not add invented requirements to this parity backlog.
- Invitation email is **deployed but deliberately disabled**: hosted version 2
  has `invitationEmailRolloutEnabled = false`. Flutter's Send email control calls
  the disabled endpoint; web explains sharing a link/code instead. No successful
  email capability exists to port until rollout resumes; then web needs a send
  action as well. Do not conflate this with the undeployed browser-push changes.
- Production legal/verification/payment-plan copy, callback/origin configuration,
  native app associations and release acceptance remain shared launch work.
- Phase route references and draft-currency documentation were refreshed with the
  correction report. Historical findings above intentionally retain their baseline context.

## Ordered work and completion gates

### A — Correctness and cross-client record preservation

- [x] W01: QR normalization and manual-entry fallback; live enrollment acceptance remains in C.
- [x] C01: Preserve RFQ country/currency/visibility and structured location.
- [x] C02/C03: Make Flutter listing custom units/lead times and existing text
      editable; display actual currency and reconcile validation rules.
- [x] W08/C03: Align quote nullable lead time, currency/terms/validity defaults.
- [x] C04: Correct and verify Flutter PDF retry.

### B — Complete web capabilities and small interactions

- [x] W03/W04: Search all native-supported RFQ/latest-preview fields with correct
      authorized pagination and selected-company scope.
- [x] W05: Remove unavailable saved listings without exposing private details.
- [x] W02: Global unread notifications and nonblocking live freshness.
- [x] W06/W07: Zoom/pan/reset and safe legacy photo embedding, shared by live and
      older-history rendering; browser fixtures verify workspace-lock cleanup.
- [x] W09/W10/W11: Account metadata, password visibility and invitation copying.
- [x] C05: Align company/RFQ tab scopes and explicit timestamp presentation; live cases remain in C.
- [x] Operational: Add categorical browser client-error reporting; production alert acceptance remains open.

### C — Cross-client live acceptance

Use controlled staging buyer/supplier accounts; do not infer acceptance from
source inventory or screen existence.

| Acceptance journey | Required cases                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth and account   | Signup confirmation, login, recovery, password/email change, QR/manual MFA enrollment/verification/removal, rate/error/retry, logout and another tab/browser Back.                                                |
| Company access     | Owner/admin/member/buyer/supplier roles, default/custom/empty permissions, single/multiple companies, membership removal or MFA/status/verification change while a page/viewer is open.                           |
| Seller records     | Web-created custom unit/10-day listing edited in Flutter and back; short/long text, empty optional fields, specs, 0/5 images, interrupted uploads, moderation/rejection/resubmit/pause/resume/archive.            |
| RFQ records        | Web-created invited USD/non-Canada draft edited in Flutter and back without changing audience/currency/address; drafts/direct/closed/invited/quoted tabs; native search-field terms and pagination.               |
| Quotes             | Flutter quote with blank lead time, web currency/terms/validity values, expired/mixed-currency comparison, multiple quote versions, accept/reject/withdraw, simultaneous close/accept from both clients.          |
| Messages           | Each client sends text and captioned photo/PDF to the other, desktop/local hostname/mobile/staging, uncertain acknowledgement/retry UUID, older-history edits/deletions, archived/read/unread and preview search. |
| Chat photos        | JPEG/PNG/WebP, legacy missing MIME, load/error/retry, zoom/pan/reset, keyboard/touch navigation, private access after logout/company/permission changes.                                                          |
| Saved records      | Available/unavailable/blocked listing and supplier removal, later pages, saved-search ownership/matches/frequency/deletion and alert destinations.                                                                |
| Deals and reviews  | Both parties' milestone authority, dates/tracking/notes, private document upload/removal/open, completion confirmations, eligible/duplicate reviews, response/report, multi-page PDF preview/retry/share.         |
| Account tools      | Team join/revoke/roles/restrictions, active plan/limits/change/cancel/invoices, insight periods, support replies/stale appeals/ownership transfer, export pagination, deletion/cancel and blocked history.        |
| Web layouts        | Mobile Safari/Chrome and desktop browser: navigation, keyboard, focus, touch targets, dialogs, sticky controls, filter overflow and upload/send error states.                                                     |

- [ ] Record actual clients/roles, steps, records/fixtures, expected outcome and
      result for each case; passing one happy-path user does not close the matrix.
- [ ] Recheck callback/domain/legal/release configuration and document staging
      evidence against the exact deployed revisions.

### D — Deferred integrations when authorized to resume

- [ ] W12: Browser Firebase/VAPID configuration, additive backend deployment and
      foreground/background delivery/recipient/session/logout acceptance.
- [ ] Invitation email sender/rollout and web send action, with native regression.
- [ ] Native HTTPS association/install handling and physical-device link opening.

Do not mark full parity or any phase completion gate complete until the confirmed
gaps and relevant acceptance cases are resolved. Most findings require client
changes, not a backend redesign; browser push is a confirmed additive backend
exception, and richer search may benefit from a narrowly scoped query extension.
