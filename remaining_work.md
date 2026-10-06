# Salam Sourcing web app — remaining work

Reviewed: **2026-10-06**.

This document captures the two in-depth comparisons and the read-only Flutter,
visual, and hosted-backend review in this conversation. It is the reference
checklist for making the website a complete web client for Salam Sourcing.
Unchecked items are outstanding web work or acceptance checks, not claims that
the corresponding Flutter implementation is missing.

The work below is organized into **six dependency-ordered phases**. Phases 1–5 code
is implemented and locally verified; their live acceptance gates remain open.
Phase 6 invitation compatibility and regression tooling are implemented. Browser
push is prepared but disabled and deferred at the user’s request.
Complete and verify one phase before starting the next; an implemented screen
alone does not satisfy its completion gate.

## Public website follow-up — implemented locally

- [x] Make `/` the public marketplace preview and preserve the marketing homepage at `/platform`.
- [x] Allow search/filter drafting; prompt sign-in on Search, Apply filters and product/company clicks. Preserve selected discovery filters through login.
- [x] Remove `/app/` from current website URLs while keeping protected legacy redirects.
- [x] Restrict anonymous database access to public card fields; apply the invoker preview RPC without changing authenticated Flutter contracts.
- [x] Keep company verification checks on company profiles with an explanation and `/verification` Learn more destination; remove company badges elsewhere.
- [x] Add `/plans` with exactly three placeholders and correct responsive card/action spacing.
- [x] Add public-page canonical metadata, staging noindex, a sitemap and production robots rules.
- [ ] Deploy and accept the new public website on staging with real cross-client login continuation.
- [ ] At production cutover, align `SITE_URL`, Astro site, callback configuration and Search Console; verify indexable public pages and excluded private pages.
- [ ] Replace the three placeholders once final plan names, prices and included features are provided.

Evidence, backend migration and SEO limits: [public website follow-up](documentation/public_browse.md).

## Phase roadmap and progress

**Current phase: Phases 5–6 — account tools delivered; final live acceptance pending.**
Later phases were started at the user’s request while earlier staging acceptance
remains open. Browser push configuration and deployment are deferred. Invitation
email remains disabled. See [Phase 1 evidence and setup](documentation/phase_1.md),
[Phase 2 implementation and checks](documentation/phase_2.md), and
[Phase 3 implementation, UI corrections and checks](documentation/phase_3.md), and
[Phase 4 deals, reviews, exports and image embeds](documentation/phase_4.md),
[Phase 5 account tools and evidence](documentation/phase_5.md), and
[Phase 6 integrations and release gates](documentation/phase_6.md).

| Phase | Scope                                                                                                                                       | Depends on                | Completion gate                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Shared backend contracts, authentication/MFA/recovery, session and company boundaries, visual foundation, public website and account safety | Read-only review baseline | Users can register/sign in/recover/sign out safely, select an authorized company, and use the responsive public/authenticated shell. |
| 2     | Company onboarding/verification, seller catalog, discovery/details/saved items                                                              | Phase 1                   | Suppliers manage real listings; buyers find and save the same authorized records on web and Flutter.                                 |
| 3     | Enquiries, invitations to quote, quotes/comparison and messaging                                                                            | Phase 2                   | A buyer and supplier complete the enquiry-to-accepted-quote journey across both clients.                                             |
| 4     | Deal milestones, private documents, completion, reviews and exports                                                                         | Phase 3                   | Both parties complete the same deal across clients, with correct document access and review eligibility.                             |
| 5     | Teams/permission administration, profile settings, billing, in-app notifications, saved searches, dashboards and insights                   | Phases 1–4                | Remaining account tools and alerts use actual backend records and effective permissions consistently.                                |
| 6     | Browser push, invitation-link integration, responsive/accessibility acceptance, full regression and launch readiness                        | Phases 1–5                | Full parity is verified and the intended browser integrations and shared launch dependencies are resolved.                           |

- [ ] Phase 1 complete — implementation and completion-gate evidence recorded.
- [ ] Phase 2 complete — implementation and completion-gate evidence recorded.
- [ ] Phase 3 complete — implementation and completion-gate evidence recorded.
- [ ] Phase 4 complete — implementation and completion-gate evidence recorded.
- [ ] Phase 5 complete — implementation and completion-gate evidence recorded.
- [ ] Phase 6 complete — implementation and completion-gate evidence recorded.

Security, responsive design, accessibility, loading/error states, and permission
checks apply in every phase. Establish their shared implementation in Phase 1,
then verify each new surface as it is introduced. Phase 6 repeats the complete
acceptance matrix; it is not the first security or failure-handling review.

Team restrictions must be enforced from Phase 1 even though their administration
screens arrive in Phase 5. Use existing memberships, roles, and effective permission
contracts. Do not treat unfinished administration UI as permission to bypass them.

When starting a phase later, refresh its Flutter/backend contracts against current
source, implement only that phase and its prerequisites, and record code/check
evidence below. Any unresolved dependency remains open and blocks completion.

## Product objective and scope

Visitors should reach a useful public Salam Sourcing website, register or log in,
and then perform the same marketplace work available in the Flutter app. Both
clients must use the same accounts, companies, records, workflow rules, and
backend authorization. A task started on one platform must be continuable on the
other.

- [ ] Provide public landing, About/how-it-works, support, and legal content.
- [ ] Provide the complete authenticated marketplace workspace.
- [ ] Preserve the five main destinations: **Discover, Enquiries, Sell, Messages,
      Account**.
- [ ] Preserve company selection, effective permissions, verification restrictions,
      subscription limits, and business-record privacy across both clients.
- [ ] Adapt layouts for desktop and mobile web while keeping the same capabilities
      and information hierarchy.

The app is a B2B sourcing product. Its central journey is:

**Discover → inspect listing/supplier → enquire → communicate → compare quotes →
accept → track deal → confirm completion → review.**

A shopping cart, instant product checkout, exchange-rate conversion, or persistent
offline message outbox is not part of the current parity baseline. Do not invent
these requirements while porting existing workflows.

## Phase 1 — secure foundation and public website

**Purpose:** establish the shared client architecture and safe entry to the product
before exposing marketplace mutations. Support existing accounts/companies now;
new-company creation and verification are delivered in Phase 2.

**Prerequisites:** current contract review; confirmed target domains and backend.
No business-backend redesign is assumed. Verify the configuration exceptions in
the backend reference before promising browser readiness.

### Backend contracts and integration

- [x] Configure the web client against the same intended Supabase project using
      public/publishable client configuration.
- [ ] Map Dart models and repository contracts into typed TypeScript interfaces,
      preserving IDs, field names, nullable values, units, currencies, and timestamps.
- [x] Use the signed-in user's authorization for normal marketplace requests.
- [x] Reuse guarded RPCs for transitions rather than inventing direct writes that
      bypass the existing workflow.
- [x] Do not use a service-role key for ordinary customer actions or expose one to
      the browser.
- [x] Verify current hosted definitions match the app contracts before implementation.
- [ ] Reconcile local migration filenames and hosted versions before automated
      backend deployment; source filenames and hosted versions have differed.
- [x] Keep any browser-specific extensions narrow, additive, and compatible with
      existing Android/iOS clients.

### Authentication callbacks and domain configuration

- [x] Implement HTTPS signup-confirmation and password-recovery callback routes.
      Flutter currently uses `com.salamsourcing.marketplace://login-callback`.
- [ ] Verify exact production/staging callback URLs are permitted by Supabase Auth;
      retain the mobile callbacks. Do not assume the current hosted allowlist is missing
      or already correct: it was not inspected in this review.
- [ ] Verify Site URL and confirmation/recovery email templates route each client
      appropriately.
- [ ] Verify Turnstile hostname configuration for the intended web domain. The
      Flutter CAPTCHA configuration currently defaults to `https://test.salamsourcing.com/`.
- [x] Integrate the user-provided web widget `0x4AAAAAAFO7STkIlGsSXpd_` into
      local/example configuration and reset/remove each form's widget after its
      protected request. CAPTCHA lifecycle tests cover fresh retry tokens and failures.
- [x] Verify the replacement widget passes a fresh real localhost challenge and
      reaches Supabase credential validation, while an invalid token remains
      rejected with `captcha_failed`. The provider secret blocker is resolved.
- [x] Verify mobile login: the user confirmed it works after the provider-secret
      update and hostname URL handoff. This is user-reported acceptance, separate
      from the automated localhost challenge verification.
- [ ] Verify CAPTCHA replay rejection against the live protected endpoint. The
      raw LAN IP last returned `110200`; use the working hostname for phone tests.
- [x] Align Flutter's public widget key and build defaults with the changed shared
      Auth provider; account for installed clients still using the previous widget.
      See [existing widget evidence](documentation/phase_1.md#existing-widget-integration-follow-up).
- [ ] Verify invitation-function origin configuration. Its source defaults to
      `https://test.salamsourcing.com`; the effective runtime origin was not inspected.
- [x] Keep invitation delivery disabled until the existing sender/rollout requirements
      are deliberately satisfied; do not enable email as an incidental porting action.

### Authentication and account boundaries

- [x] Implement email/password login with useful validation and server-error handling.
- [x] Implement signup with first/last name, email, password, and profile provisioning.
- [x] Carry over Buy/Sell/Both onboarding intent presentation; do not treat a client
      choice or user-editable metadata as authorization.
- [x] Handle confirmation-required accounts and verification-email navigation.
- [x] Implement forgot-password, recovery callbacks, password updates, and any
      reauthentication/nonce requirements used by the app.
- [x] Request a fresh CAPTCHA token for each applicable login/signup/reset attempt;
      handle cancellation, expiration, replay rejection, and network failure.
- [x] Implement authenticator enrollment, QR/manual secret presentation, six-digit
      verification, removal, and abandoned-unverified-factor cleanup.
- [x] Recheck MFA requirements on restored sessions before private profile/marketplace
      access. Recovery must not bypass the enrolled second factor.
- [x] Preserve loading, submitting, invalid-code, rate-limit, retry, and sign-out states.
- [x] Validate account/profile readiness before entering the authenticated workspace.
- [ ] On logout/account change, dispose private views and subscriptions and clear
      account-specific data/image caches.
- [ ] Ensure browser Back, reload, direct links, and another open tab cannot restore
      usable private state after logout or lost access.
- [ ] Handle expired/revoked sessions and remote MFA/account changes consistently.

### Company context and account safety

- [x] Implement active-company selection with account-scoped persistence and data
      invalidation when the selected company changes.
- [x] Implement reports for companies/listings/messages/reviews as applicable.
- [x] Implement blocked-company list, blocking/unblocking, and resulting access rules.
- [x] Implement account deletion scheduling, `DELETE` confirmation, 30-day recovery,
      cancellation/status, and the current retention/anonymization explanation.
- [x] Provide Help Center, Terms, Privacy, and contact/support actions.
- [ ] Replace development-placeholder policies with reviewed production content and
      define acceptance-version/timestamp handling before launch.

### Security and reliability foundation

Shared backend authorization is necessary but does not automatically make a new
browser client equally secure.

- [x] Choose session storage explicitly. Native Flutter uses secure storage;
      Flutter's current web branch uses memory-only sessions. Do not silently default
      the new website to persistent plaintext token storage.
- [x] If using SSR/cookies, implement the appropriate browser/server clients,
      validated callbacks/PKCE and refresh handling, cookie protections, and mutation
      protection. A web session design does not itself require a marketplace migration.
- [x] Create server-side user clients per request; do not share mutable user/session
      state between requests.
- [ ] Prevent shared CDN/Cloudflare caching of private responses or responses that
      set/refresh authentication cookies; verify actual cache behavior.
- [x] Preserve backend active-session/account/MFA checks; a locally present token,
      hidden button, or verified JWT alone must not replace the existing authorization.
- [ ] Scope queries/caches/subscriptions to account and company; invalidate stale
      access after switching, membership removal, permission changes, blocking, or logout.
- [x] Render descriptions/messages/notes safely; avoid unsafe HTML insertion.
- [x] Keep privileged secrets out of browser bundles and private data/tokens out of
      URLs, diagnostic logs, analytics, crash reports, and notification previews.
- [x] Configure website security headers/content policy appropriate to the actual
      Auth, CAPTCHA, Realtime, image, and document integrations.
- [ ] Preserve private Storage, permitted MIME/size limits, signed-URL expiry, and
      authorization when opening files; already-issued URLs may survive until expiry.
- [ ] Port upload-and-attach cleanup/journaling behavior and prevent orphan cleanup
      from deleting referenced business files.
- [x] Handle retries, request races, double submissions, stale records, and outages
      without duplicate work or false success messages.
- [x] Preserve preview/development distinctions; never expose simulated submissions
      as successful production business operations.

The security items above are ongoing requirements: establish the primitives here,
then apply and recheck file authorization, upload cleanup, caching, retries, and
session invalidation in every later phase that uses them. Mark a broad item
complete only when all applicable implemented surfaces are covered.

### Shared visual tokens and components

The current Flutter theme supersedes the earlier bright-red comparison:

| Token           | Current value |
| --------------- | ------------- |
| Primary         | `#9C272E`     |
| Primary soft    | `#F7ECEE`     |
| Primary border  | `#DFC1C5`     |
| Secondary       | `#37505C`     |
| Page background | `#F7F8FA`     |
| Surface         | `#FFFFFF`     |
| Soft surface    | `#F1F3F6`     |
| Border          | `#D9DFE5`     |
| Primary text    | `#1A2028`     |
| Secondary text  | `#60656F`     |
| Success         | `#2E7D32`     |

### Shell, authentication and shared interaction styling

- [x] Replace old web theme values with current Flutter tokens.
- [x] Load Inter explicitly; declaring it in CSS does not load the font.
- [x] Use the current clean logo asset and suitable website/favicon variants.
- [x] Preserve white rounded surfaces, continuous outlines, subtle shadows, aligned
      dividers, and clear status/verification/urgency badges.
- [x] Carry over the approximate component scale: 12 px input/button corners,
      16 px cards, 20 px dialogs, and 24 px sheet/chip shapes where applicable.
- [x] Preserve the floating five-destination mobile dock and safe-area/content spacing.
- [x] Adapt the light login and dark dotted signup presentation from current source;
      do not assume every hardcoded auth color belongs to the shared theme.
- [x] Provide mobile header navigation; current web main links disappear below the
      desktop breakpoint without a replacement menu, although footer links remain.
- [x] Preserve clear loading/empty/error/success/retry states and confirmations.
- [x] Match restrained motion and honor reduced-motion preferences.
- [x] Preserve native haptics for new Flutter tap controls under the user instruction;
      provide clear visual/accessibility feedback on web and assess platform-supported
      haptic equivalents without assuming browser-wide availability.

Build the five-destination shell and desktop navigation now. Destinations whose
workflows arrive later must accurately show their implementation state. Reuse the
components and feedback patterns above in each subsequent phase; full desktop
screen composition and the complete accessibility matrix are checked in Phase 6.

### Public website content and discoverability

- [x] Replace sample catalog content and decorative stars with real authenticated
      discovery or clearly intentional public marketing content.
- [x] Make “Join free” reach actual registration and login reach actual authentication.
- [x] Expand “How it works” to explain the sourcing/enquiry/quote/deal workflow.
- [x] Verify or remove the unsupported `10k+` product and `120+` category claims.
- [x] Explain buyer, supplier, and combined company use cases accurately.
- [x] Provide correct support, legal, and authenticated-workspace destinations.
- [x] Verify public-page titles, descriptions, canonical/social metadata, navigation,
      and indexability; keep private workspaces and business records out of public indexing.
- [x] Check accessible form labels, field names/autocomplete, and native semantics.

### Completion gate

- [ ] Verify registration/confirmation, login, CAPTCHA, MFA restoration, password
      recovery and logout against the intended configuration. Exercise direct links,
      browser Back, reload and multiple tabs; verify private data and company context
      cannot survive lost access. Confirm the public website/navigation/auth layouts
      are usable on desktop and mobile, and safety/deletion actions use existing rules.

**Evidence (2026-10-05):** implemented public/auth/account routes, per-request
Supabase SSR client, hosted types, MFA/access guards, company/safety handlers,
session boundaries, shared components and CI. Thirty isolated tests, 77 dev HTTP
assertions and 95 production HTTP assertions pass. Production build succeeds;
type checks have no errors/warnings. Browser checks cover public/auth navigation,
mobile menu, native validation and 320/390/1440 px signup without overflow.

Checked items mean implemented and locally verified on current surfaces, not
real email/CAPTCHA/MFA or authenticated cross-client acceptance. Actual CDN cache
behavior, restoration/Back/multiple-tab loss of access, Auth/Turnstile settings
and final policies remain open. File/subscription boundaries and full workflow
typing are applied and verified in later phases as those surfaces arrive.

The refreshed backend has the ten required Phase 1 RPCs, but migration versions
differ and the latest Flutter support/export APIs are not deployed. No live
backend change was made. See [Phase 1 notes](documentation/phase_1.md) for evidence,
configuration and the remaining staging matrix.

## Phase 2 — company onboarding, catalog and discovery

**Purpose:** create and expose the actual marketplace records needed by the sourcing
journey. Finish company verification and listing lifecycle before relying on those
records in enquiries and quotes.

**Prerequisite:** Phase 1 accepted for release. Phase 2 implementation proceeded at
user request with Phase 1 staging acceptance still open. Preserve account/company boundaries and effective
permissions on all reads, saves, uploads and listing transitions.

### Company onboarding, verification and seller catalog

- [x] Implement company onboarding: legal/display names, buyer/supplier/both type,
      optional registration number/description, contact details, website, address,
      country/province/city/postal code, review, and representation confirmation.
- [x] Create an unverified company first; keep verification as a separate workflow.
- [x] Implement company-profile updates and verification-document management.
- [x] Show verification submission, pending/rejected/approved states and review reasons.
- [x] Implement the Sell overview, active-company summary, listing statuses/counts,
      post-item action, and supplier-insights entry point.
- [x] Implement product/service creation and editing: category/subcategory, name,
      description, specification key/value pairs, price, unit, MOQ, lead time, and origin.
- [x] Preserve form/review/success steps, validation, duplicate-submission protection,
      recoverable server errors, and partial-upload handling.
- [x] Preserve the listing image limit: five images, JPEG/PNG/WebP, under 5 MB each;
      respect existing images when editing and preserve cover/display-order behavior.
      Web/Flutter enforce the count in application checks; a race-proof global
      database cap is not present in the existing backend (see Phase 2 evidence).
- [x] Implement manual server-saved drafts and submit-for-review.
- [x] Implement edit/resubmit, pause, resume, and archive with confirmations where used.
- [x] Preserve listing permissions, verification requirements, quotas, and moderation
      restrictions; a submitted listing is not automatically public.

### Discovery, listing details, suppliers and saved items

- [x] Replace sample products/suppliers/categories with live backend data.
- [x] Search across products, suppliers, descriptions, and categories.
- [x] Fetch the real active taxonomy; preserve exact category values.
- [x] Implement location, currency, minimum/maximum price, maximum MOQ, maximum lead
      time, and verified-only filters.
- [x] Implement newest, price-low, price-high, and lead-time sorting.
- [x] Preserve currency grouping and avoid implying exchange conversion.
- [x] Implement the existing 24-listing page contract, load-more, duplicate prevention,
      debouncing, stale-response protection, retained results, and retry behavior.
- [x] Provide loading, empty, no-results, inaccessible-record, and network-error states.
- [x] Link listing cards to authorized listing-detail routes.
- [x] Show images/gallery, supplier, title, category, description, specifications,
      price/currency, units, MOQ, lead time, origin, and verification on detail views.
- [x] Provide supplier/company profile navigation and guarded contact-supplier navigation.
      Enquiry submission remains in Phase 3.
- [ ] Complete contact-action quota acceptance in Phase 3. Phase 2 checks company,
      own-company, verification and procurement permission before navigation, and
      uses authorized supplier/listing reads; it submits no enquiry.
- [x] Record listing views through the existing API without blocking display on
      metrics failures.
- [x] Show authorized supplier summaries, listings, review totals, and verification;
      do not expose private company identity/verification fields through public summaries.
- [x] Save/unsave listings and suppliers with account-private persistence.
- [x] Provide paginated saved-item views and removal of inaccessible saved suppliers.
- [x] Preserve save failures/retries without falsely displaying an assumed save state.
- [x] Provide reporting/blocking entry points where the app exposes them.

### Discovery and listing visual parity

- [x] Preserve raised industry-category pills, icons, exact selections, and label
      wrapping/horizontal browsing.
- [x] Carry over listing-card supplier/title/category/MOQ/location hierarchy,
      image fallback, verification badges, and saved actions.

Contact-supplier navigation is established here; its enquiry submission completes
in Phase 3. Existing safe reporting/blocking actions from Phase 1 must already work
on listing/supplier surfaces. Show verification and moderation states truthfully.

### Completion gate

- [ ] Create a company and follow its verification states; create/edit/draft/submit/
      pause/resume/archive authorized listings and verify their visibility in Flutter.
      Search/filter/sort/paginate real records, open listing/supplier details, and
      save/unsave across clients. Verify upload limits, unverified/restricted accounts,
      moderation, quotas, empty/error states and company-switch invalidation.

**Evidence:** [Phase 2 notes](documentation/phase_2.md): refreshed hosted schema,
46 isolated regression tests, type check, production build, 150 production HTTP
assertions and desktop/mobile component checks. Live signed-in, moderation,
quota and Flutter cross-client acceptance remains open. Checked implementation
items above do not mark this completion gate accepted.

## Phase 3 — enquiries, quotes and messaging

**Purpose:** complete the central buyer/supplier sourcing journey using the catalog
and company records from Phase 2.

**Prerequisite:** Phase 2 accepted. Implementation proceeded at the user’s request
while earlier live gates remain open. Reuse shared file handling, safe rendering,
permission checks, retry IDs and account/company invalidation from Phase 1.

### Enquiries and quotes

- [x] Implement All Enquiries, My Enquiries, and Saved views with query/filter behavior.
- [x] Implement public RFQs and direct listing/supplier enquiries.
- [x] Preserve title, requirements, category, quantity/unit, delivery location,
      deadline, urgency, and existing currency/location defaults.
- [x] Implement manual server drafts, editing/resubmission, review/publication states,
      and rejection feedback.
- [x] Implement supplier invitations and enquiry attachment upload/open/delete actions.
- [x] Implement close/cancel actions with the existing confirmation and access rules.
- [x] Preserve verified-party requirements, quote deadlines, blocked-company rules,
      role restrictions, and monthly limits.
- [x] Implement quote submission with unit/total price, lead time, notes/terms,
      validity, validation, and useful failure feedback.
- [x] Implement withdraw/revise, reject, and accept flows; retain explicit acceptance
      confirmation and current server-state checks.
- [x] Implement quote comparison: status, currency/unit/total price, lead time,
      verification/reviews, payment/shipping terms when supplied, expiry, notes,
      supplier navigation, and selection.
- [x] Preserve newest, total-price-within-currency, and shortest-lead-time ordering.
- [x] Handle unavailable supplier information and expired/unavailable quotes.
- [x] Allow the same authorized single-quote/all-quote PDF exports.

### Messaging

- [x] Implement active/archived conversation lists and conversation search.
- [x] Show supplier/company identity, verification, latest preview/time, and unread
      counts/highlights; cap displayed large counts at `99+`.
- [x] Implement message threads with enquiry/product context and read/seen state.
- [x] Load older history with the existing timestamp/ID cursor.
- [x] Reuse Realtime and refresh on reconnect/resume; retain loaded history on failure.
- [x] Preserve the current unsent draft and provide explicit failed-send retry.
- [x] Reuse the same text-message request ID on retry to avoid duplicate insertion.
- [x] Implement file attachments, format/10 MB validation, authorized URLs, and upload
      failure feedback/cleanup.
- [x] Do not present fabricated online/presence indicators as actual presence.

### Enquiry, messaging and settings surface styling

- [x] Carry over enquiry-card requirements, quantity/location, urgency, and quote/save
      actions; keep Messages and Settings surfaces/dividers consistent.

- [x] Remove selected-company verification from the global page heading; retain
      verification where it identifies the actual supplier or business record.
- [x] Hide the company selector for zero/one membership; align selector and Switch
      controls when multiple memberships exist.
- [x] Group page title, description and primary navigation actions consistently;
      correct responsive spacing, settings dividers and comparison-table overflow.

Carry the shared settings surface treatment forward into Phase 5. Implement
single/all-quote exports here as required by the quote checklist; Phase 4 completes
the common quote/deal PDF presentation and sharing checks. Notification-center
controls arrive in Phase 5; conversation/session authorization is required now.

### Shared backend concurrency follow-up

- [x] Apply attachment file-path uniqueness and confirm duplicate-safe metadata
      retries in both web and Flutter.
- [x] Check enquiry state inside acceptance under the enquiry lock and use
      consistent parent-before-quote lock order.
- [x] Enforce the five-image cap under the listing lock for every client.
- [x] Preserve current permissions, moderation rules, business records and files;
      verify concurrent transactions and both client regression suites.
- [ ] Deploy the updated web client/build Flutter and complete signed-in release
      acceptance with the shared guards.

**Evidence:** [Concurrency fixes](documentation/concurrency_fixes.md):
migration applied and verified on the shared project; 372 native Postgres checks
including five simultaneous-request cases; 367 PGlite checks; 95 Flutter tests;
75 web tests and 212 production HTTP assertions. These three backend findings
are resolved.

### Completion gate

- [ ] Create an RFQ on web, quote in Flutter, communicate with text/files, compare
      and accept on web, and verify the shared records in both clients. Exercise
      direct enquiries, drafts/review/rejection, invitations to quote, quote revisions/
      withdrawal/expiry, blocked companies, restricted members, quotas, older message
      history, reconnects and duplicate-safe retries. Verify quote exports and explicit
      acceptance; opening the resulting deal is completed in Phase 4.

**Evidence:** [Phase 3 notes](documentation/phase_3.md): refreshed hosted schema
and read-only RPC/RLS/Storage/Realtime inspection; 75 passing isolated tests,
successful Astro check/Cloudflare build, 212 production HTTP assertions,
desktop/mobile component checks, older-history and lost-acknowledgement retry
checks, and all four sample PDF pages visually inspected. No live backend
configuration, business records, files or Flutter source were changed in the initial
phase. The subsequent concurrency follow-up applied shared backend guards and
updated Flutter source as documented above. The web ↔ Flutter completion gate
remains open; implementation checkboxes do not imply live acceptance.

## Phase 4 — deals, documents, completion and reviews

**Purpose:** finish the transaction after quote acceptance, including evidence,
separate party confirmations and eligible reviews.

**Prerequisite:** Phase 3 accepted and an accepted quote creates the expected deal.
Preserve separate deal-document authorization and all existing actor/state rules.

### Deal lifecycle, private files, reviews and PDFs

- [x] Open the correct deal from enquiry details or the buyer dashboard.
- [x] Implement sequential milestones: agreed → preparing → shipped → received.
- [x] Enforce supplier preparation/shipment and buyer receipt actions.
- [x] Show shared notes, actor/company history, timestamps, expected delivery,
      tracking/reference, and current state.
- [x] Handle stale/duplicate transitions and completed/cancelled deal restrictions.
- [x] Keep receipt separate from both parties' completion confirmations.
- [x] Implement separate buyer/supplier completion confirmations and resulting
      review eligibility.
- [x] Use the separate private deal-document bucket; documents must not become
      accessible to other RFQ bidders.
- [x] Preserve PDF/JPEG/PNG and 10 MB deal-document limits, upload restrictions,
      attachment immutability, and five-minute signed URLs.
- [x] Implement company reviews, transaction verification labels, reviewed-item
      information, ratings/text, company responses, editing responses, and reporting.
- [x] Preserve the one-review/eligibility rules enforced by the existing APIs.
- [x] Generate, preview, download/print/share quote and deal PDFs using browser
      equivalents, preserving identities, currencies, terms, expiry, generation time,
      pagination, long content, and Inter font rendering.
- [x] Keep exported summaries labelled as business records; they are not payment
      invoices, receipts, or delivery proof. Export/sharing must be explicit.

### Message image embeds and UI corrections

- [x] Embed JPEG/PNG/WebP attachments inline in both initial message history and
      subsequent live/older-history updates; keep explicit download/open actions.
- [x] Authorize every image request using the selected company and private Storage
      policies, without exposing raw paths or reusable image signed tokens.
- [x] Show image failure fallback, keep PDF attachments as downloads, preserve image
      aspect ratio and avoid reloading unchanged images during message refreshes.
- [x] Check deal, document, review, dashboard and export layouts at mobile/tablet/
      desktop widths. Wrap long names and five-tab navigation without page overflow.

### Completion gate

- [ ] Advance a supplier's agreed/preparing/shipped states, record buyer receipt,
      confirm completion independently from both sides and verify review eligibility
      across clients. Check other bidders cannot open deal documents, URLs expire as
      intended, duplicate/stale transitions fail safely, responses/reporting work, and
      quote/deal PDFs retain correct values, labels and long-content pagination.

**Evidence:** [Phase 4 notes](documentation/phase_4.md): hosted function/Storage/RLS
contracts rechecked; no backend, Flutter or customer-data changes. Web **93 tests**,
**367** isolated backend regression checks, development **232** and production
**250** HTTP assertions passed; Astro check/build passed. Isolated browser fixtures
verified receipt vs completion, both-party review eligibility, response editing,
inline images, cancelled-state restrictions and responsive layouts. PDF pages were
rendered and their identities, values, terms and disclaimers extracted and checked.

The live web ↔ Flutter completion gate and real-device share/print acceptance remain
open. Deploy the web source before treating this as a released feature.

## Phase 5 — teams, account tools and productivity

**Purpose:** complete ongoing workspace administration and the app's supporting
features after the core sourcing/deal journey works end to end.

**Prerequisites:** Phases 1–4 accepted. Account safety, effective permissions and
company switching already exist; this phase adds their remaining management UI.

### Profile settings, teams, invitations and billing

- [x] Implement personal-profile and company-profile settings.
- [x] Implement team/member lists, invitation creation/revocation, role changes,
      removal, and existing owner/admin authority rules.
- [x] Preview company and assigned role before invitation acceptance.
- [x] Preserve verified invited email, expiry, replay/revocation, issuer authority,
      and subscription seat-limit checks.
- [x] Provide web links/manual invitation codes and continuation through login/signup
      without confusing invitation parameters with Auth PKCE `code` parameters.
- [x] Implement owner-assigned permission restrictions for listings, sales/chat,
      procurement/chat, insights, billing, and team administration. Overrides restrict
      role authority; they do not promote members beyond their existing role ceiling.
- [x] Keep permission-aware controls consistent with independent backend enforcement.
- [x] Show actual plan/status/limits, invoice history, pending plan-change requests,
      change requests, and cancellation requests. Do not ship preview membership data
      as real account information or imply an unimplemented instant payment checkout.

### In-app notifications and preferences

- [x] Implement notification center, unread count, mark-read/all-read, and deletion.
- [x] Resolve notification destinations to the exact authorized record; select its
      company when needed and handle records that are no longer available.
- [x] Implement message, enquiry, quote, deal, listing-review, and saved-search
      preferences, including global saved-search preference and push distinctions.
- [x] Treat in-app notification parity separately from the browser-push extension.
- [x] Preserve account/company permission revocation and recipient/session validation
      when opening notifications or existing conversations.

### Saved searches, buyer dashboard and supplier insights

- [x] Save named discovery queries/categories/filters and RFQ queries.
- [x] Implement private saved-search lists, editing alert frequency, deleting, and
      current result navigation; preserve current limits/defaults.
- [x] Alerts are initially off; provide explicit hourly/daily opt-in and respect the
      global preference. Current alerts appear in the in-app center, not email/OS push.
- [x] Reuse existing matching/scheduler APIs rather than creating a duplicate worker.
- [x] Implement the selected-company buyer dashboard: full counts plus deadline and
      expected-delivery lists linked to the correct enquiry/deal. Delivered in Phase 4.
- [x] Implement supplier insights for 7/30/90 days: listing views, direct enquiries,
      quotes, deals, quote acceptance, enquiry conversion, average first reply, and
      per-listing counts.
- [x] Preserve aggregate-only privacy, unavailable/zero-denominator states, and
      current metric limits. Do not imply historical collection before it began.

Manual invitation preview/acceptance and login continuation must work here even
while invitation email remains disabled. Browser email-link/provider integration
and background push are handled explicitly in Phase 6. Existing in-app matching
alerts remain part of this phase and do not require a new worker.

### Refreshed Flutter support and personal export

- [x] Verify shared deployment of `customer_support` and `panel_customer_export`;
      both are present in the refreshed hosted inventory. The original review
      preceded their deployment; current signatures were inspected before use.
- [x] Port support-request list, versioned replies, appeal subjects/actions and
      ownership recovery with the same permission and concurrency rules.
- [x] Port paginated personal export with bounded pagination, the same sections,
      backend authorization and safe private download behavior.
- [x] Keep email support usable while these APIs are unavailable; never show
      fixture responses as real submitted support work.

### Completion gate

- [ ] Verify team invitations/roles/overrides and seat limits with owner, admin and
      restricted accounts; revoke access and check already-open views in both clients.
      Confirm actual billing/profile data, notification preferences and exact-record
      navigation, saved-search frequencies/matching, buyer counts/deadlines and supplier
      metrics against existing APIs. Preserve private aggregate and unavailable states.

**Evidence:** Account tools implemented and locally checked. See
[Phase 5 implementation and checks](documentation/phase_5.md). Signed-in hosted
acceptance with owner/admin/restricted accounts remains open.

## Phase 6 — browser integrations, full acceptance and launch

**Purpose:** resolve the explicit browser exceptions, verify the entire product
across clients, and establish launch readiness. Core workflows use the existing
backend; background browser push needs the narrow additive extension below.

**Prerequisites:** Phases 1–5 accepted. Recheck current backend/configuration and
shared app/admin launch dependencies before making release claims.

### Invitation-link and delivery integration

Provide compatible HTTPS invitation-email destinations if delivery is deliberately
enabled, while retaining mobile links and manual-code acceptance. Reuse Phase 5's
invitation preview and auth continuation. Verify origin restrictions, sender/provider
configuration and actual recipient delivery. Keep the existing rollout lock until
its requirements are satisfied; shipping the port does not authorize enabling it.
If email stays disabled, record that explicitly rather than claiming email parity.

- [x] Provide `/invite/:uuid` website continuation and compatible HTTPS parsing in
      Flutter; preserve the existing custom scheme and manual-code fallback.
- [x] Add HTTPS website and mobile destinations to the prepared email handler.
      The handler remains disabled and this source update is not deployed.
- [ ] Verify actual device app opening and hosted delivery. HTTPS universal/app-link
      association and deferred-install routing are still outside this implementation.

### Background browser push extension

**Deferred at the user’s request.** Checked items below mean source implementation
and isolated validation only. No push migration/function deployment or real browser
delivery is claimed. Enable/test controls stay disabled without public configuration.

- [x] Add an explicit browser registration representation; do not disguise web
      registrations as Android/iOS.
- [x] Extend the database platform constraint and registration API as necessary.
- [x] Preserve account/session ownership, token replacement/removal, revoked-session
      checks, blocked-company checks, preferences, and logout cleanup.
- [ ] Configure a Firebase web application and web push credentials — deferred.
- [ ] Apply the prepared additive web-push migration and deploy the matching sender
      in that order, then verify existing Android/iOS delivery before enabling web.
- [x] Implement browser permission handling and a service worker.
- [x] Adapt delivery/click destinations to open the correct authorized web record.
- [x] Keep notification content generic; private message/file content must not be
      exposed in a notification that can outlive logout.
- [ ] Test foreground/background delivery, permission denial, rotation, logout,
      stale sessions, multiple devices, and supported target browsers.

### Complete desktop, responsive and accessibility acceptance

- [x] Implement desktop navigation, an obvious active-company control, listing grids,
      conversation-list/thread columns, wider quote comparison, forms, and dashboards.
- [ ] Verify keyboard navigation, visible focus, labels, selected semantics, screen
      readers, zoom/large text, RTL layout, wrapping, and horizontal table access.
- [ ] Test at narrow mobile widths and desktop sizes. Existing 320/390/768 px Flutter
      previews, including large-text/RTL cases, are references rather than web acceptance.

Safety/deletion, final policies, and security controls are launch requirements even
if implemented alongside earlier stages. Do not launch a partial workspace as full
parity or describe an implemented but unaccepted integration as proven delivery.

### Cross-platform acceptance matrix

- [ ] Create an RFQ on web, submit a quote in Flutter, compare/accept on web, and
      verify the same enquiry/quote/deal records on both.
- [ ] Create/edit/submit/pause/resume a listing on one client and verify its status
      and authorized visibility on the other.
- [ ] Send messages/files from both clients and verify history, read/unread state,
      older pagination, retries, and attachment permissions.
- [ ] Switch companies and verify private records/caches remain correctly scoped.
- [ ] Change a role/permission or revoke membership and verify both clients reject
      protected operations, including cached conversations/documents.
- [ ] Verify blocked companies, expired quotes/invitations, quota/seat limits, and
      unavailable records produce consistent outcomes.
- [ ] Exercise MFA enrollment/sign-in/restoration/removal, CAPTCHA, email confirmation,
      recovery, expired/revoked sessions, logout, reload, direct links, and browser Back.
- [ ] Advance supplier milestones and buyer receipt across clients; confirm both
      completions, review eligibility, responses, documents, and PDFs.
- [ ] Verify saved items/searches, notification preferences, exact destination taps,
      and matching alerts across clients.
- [ ] Verify actual plans/invoices/change requests and deletion scheduling/cancellation.
- [ ] Test two distinct accounts/companies, restricted team members, multiple open
      browser tabs, mobile/desktop browsers, large text/RTL, and interrupted networks.
- [x] Run web type/build checks and appropriate behavioral/end-to-end tests; integrate
      release checks into CI. Use isolated fixtures and verified cleanup for hosted tests.
- [ ] Demonstrate browser push and invitation email separately if enabled; function
      deployment/provider acceptance is not proof of recipient delivery.

### Shared Flutter launch dependencies and optional additions

The Flutter checklist also records policy/acceptance, invitation sender setup,
physical-device acceptance, recovery/monitoring, release signing, billing rollout,
and administrator-MFA work. Recheck its current status before treating any item
as still open: concurrent app/admin work can resolve it. These are shared launch
or mobile-release dependencies, not evidence that the web port needs a backend
redesign.

- [ ] Reconcile relevant shared launch requirements with the current Flutter/admin
      checklists before releasing the website.
- [x] Keep mobile signing/store preparation distinct from web implementation work.
- [x] Do not assume earlier tests or deployed APIs establish current production
      readiness, backup restoration, or real email/push delivery.

Persistent offline drafts/outbox and broader marketplace analytics are optional
future additions. Existing manual server drafts and supplier insights are already
part of the parity target.

### Completion gate

- [ ] Record fresh full-matrix results, passing release checks and responsive/
      accessibility verification. Resolve shared policy/security/operational blockers;
      demonstrate browser push if included and invitation delivery if enabled. Record
      any intentionally deferred integration and its product impact. Full parity must
      not be claimed while required capabilities or acceptance remain outstanding.

**Evidence:** Pending. Record changed paths, checks, results and unresolved blockers
when this phase is implemented.

## Reference — review baseline and evidence

### Web implementation at review

- Astro, React, Tailwind, and a Cloudflare adapter.
- Four routes: `/`, `/about`, `/marketplace`, `/login`; eleven source files.
- Static landing/About content and three hardcoded sample marketplace products.
- No application network calls, search/category handlers, Supabase integration,
  or authenticated workspace in the reviewed source.
- Product cards have no detail destinations and use decorative placeholder images.
- The login form has no authentication handler/action or explicit method; its
  inputs have no `name` attributes. Native required-field validation alone does
  not authenticate a user. React hydration alone would not implement login.
- “Join free” opens the login route; “How it works” opens a brief mission page.
- “10k+” products and “120+” categories are hardcoded claims without supporting
  data in this repository.
- Build/type-check/format scripts and a lockfile exist; no behavioral tests or CI
  workflow were found in the web repository. Dependencies were not installed in
  the reviewed checkout, and no web build was run in the comparison.

### Flutter and hosted-backend evidence

- Flutter source baseline: local commit **`e92f909`**, “Match Salam branding and
  polish marketplace UI”; 35 screens and 20 repository files at review.
- The earlier source inventory contained 30 migrations and three Edge Functions.
  These counts are historical inventory, not release gates or completion scores.
- Twelve existing rendered Flutter previews were inspected, covering authentication,
  discovery, enquiries, selling, messages, settings, categories, quote comparison,
  and reviews. Some use synthetic data or preview mode. They establish appearance,
  not live transaction success. Older previews must be checked against current
  source before copying details.
- Read-only hosted metadata checks used **Salam Sourcing Backend**, project
  `stjtdlwonexcgnhmgfqw`.
- Forty-eight selected business RPCs were present with execution granted to
  `authenticated` and denied to `anon`. Grants alone do not establish that every
  role-specific transaction works; workflow acceptance remains necessary.
- Hosted active-session helpers check MFA satisfaction, session existence/expiry,
  anonymous-account exclusion, and account restrictions.
- All five relevant hosted Storage buckets were private.
- Realtime publication included conversations, enquiries, messages, notifications,
  and quotes. Do not assume every business table broadcasts changes.
- Hosted push registration and the push-platform table constraint accept only
  `android` and `ios`.
- Deployed invitation-email source retains an explicit disabled rollout lock,
  configurable website-origin restriction, and mobile custom-scheme links.
- No files, business data, database definitions, deployed functions, or configuration
  were changed during the review. Tests and live/device transactions were not rerun.

Flutter documentation records an earlier successful pass of **85 Flutter tests,
360 isolated database checks, and seven push/email handler tests**. Its latest UI
log also records rendered previews and focused checks. These are recorded results,
not fresh verification performed by this review.

## Reference — backend reuse and exceptions

**Core marketplace parity should reuse the existing backend without redesigning
business logic or database schema. Complete browser parity has targeted exceptions.**

| Area                                                   | Backend implication                    | Outstanding work                                                                           |
| ------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Discovery, listings, enquiries, quotes, deals, reviews | No business-backend change identified  | Implement web views and calls to existing tables/RPCs.                                     |
| Companies, teams, permissions, billing, safety         | No business-backend change identified  | Preserve existing authorization and status rules.                                          |
| Messaging and in-app notifications                     | No change identified                   | Reuse data, subscriptions, preferences, and exact destination resolution.                  |
| Authentication/MFA/recovery                            | Usually configuration                  | Add web callback routes and verify Auth URL/redirect configuration.                        |
| CAPTCHA                                                | Hostname configuration may be needed   | Authorize the intended website hostname and integrate fresh browser challenges.            |
| Invitation acceptance by code                          | No change identified                   | Reuse invitation preview and acceptance APIs.                                              |
| Invitation-email links                                 | Small function adjustment when enabled | Add usable HTTPS website links while retaining mobile/manual access.                       |
| Background browser push                                | Additive backend extension             | Support web registration and browser delivery/click handling; configure Firebase web push. |

Existing search and supplier-profile RPCs require authentication. Public marketing
pages do not need anonymous marketplace access. If live anonymous browsing is later
requested, assess a deliberately limited public-data interface separately; do not
broaden current grants merely to populate the landing page.

## Source references

### Current web source

- [Web login](src/pages/login.astro)
- [Web marketplace](src/pages/marketplace.astro)
- [Landing page](src/pages/index.astro), [About](src/pages/about.astro)
- [Header](src/components/Header.astro), [layout](src/layouts/MainLayout.astro)
- [Web tokens](src/styles/globals.css), [dependencies/scripts](package.json)

### Flutter implementation and runbooks

Paths below assume the current sibling repository layout.

- [Marketplace workflows](../Salam-Sourcing-Marketplace-App/documentation/marketplace_product_workflows.md)
- [Procurement workflows](../Salam-Sourcing-Marketplace-App/documentation/procurement_product_workflows.md)
- [Current remaining work](../Salam-Sourcing-Marketplace-App/documentation/remaining_work.md)
- [Change log](../Salam-Sourcing-Marketplace-App/documentation/change_log.md)
- [Colors](../Salam-Sourcing-Marketplace-App/lib/core/theme/app_colors.dart), [theme](../Salam-Sourcing-Marketplace-App/lib/core/theme/app_theme.dart)
- [App/session boundaries](../Salam-Sourcing-Marketplace-App/lib/main.dart), [secure/memory-only storage](../Salam-Sourcing-Marketplace-App/lib/core/services/secure_auth_storage.dart)
- [Auth repository](../Salam-Sourcing-Marketplace-App/lib/data/repositories/auth_repository.dart), [startup gate](../Salam-Sourcing-Marketplace-App/lib/presentation/screens/supabase_bootstrap_screen.dart)
- [Company context](../Salam-Sourcing-Marketplace-App/lib/core/services/company_context.dart)
- [Listings](../Salam-Sourcing-Marketplace-App/lib/data/repositories/listings_repository.dart), [discovery state](../Salam-Sourcing-Marketplace-App/lib/presentation/state/discovery_home_state.dart)
- [Enquiries/quotes](../Salam-Sourcing-Marketplace-App/lib/data/repositories/enquiries_repository.dart)
- [Seller listings](../Salam-Sourcing-Marketplace-App/lib/data/repositories/seller_listings_repository.dart)
- [Messaging](../Salam-Sourcing-Marketplace-App/lib/data/repositories/messages_repository.dart)
- [Procurement](../Salam-Sourcing-Marketplace-App/lib/data/repositories/procurement_repository.dart)
- [Teams](../Salam-Sourcing-Marketplace-App/lib/data/repositories/company_team_repository.dart)
- [Reviews](../Salam-Sourcing-Marketplace-App/lib/data/repositories/company_reviews_repository.dart)
- [Safety](../Salam-Sourcing-Marketplace-App/lib/data/repositories/safety_repository.dart)
- [Billing/settings](../Salam-Sourcing-Marketplace-App/lib/data/repositories/account_settings_repository.dart)
- [Upload cleanup](../Salam-Sourcing-Marketplace-App/lib/core/services/upload_cleanup_service.dart)
- [Marketplace API/access migration](../Salam-Sourcing-Marketplace-App/supabase/migrations/20261005144419_marketplace_product_workflows.sql)
- [Procurement/permissions migration](../Salam-Sourcing-Marketplace-App/supabase/migrations/20261005161428_procurement_product_workflows.sql)
- [Session/push registration migration](../Salam-Sourcing-Marketplace-App/supabase/migrations/20261004010804_security_least_privilege_sessions.sql)
- [MFA guard migration](../Salam-Sourcing-Marketplace-App/supabase/migrations/20261005065837_optional_authenticator_mfa.sql)
- [Invitation email handler](../Salam-Sourcing-Marketplace-App/supabase/functions/company-invitation-email/handler.ts), [disabled rollout entrypoint](../Salam-Sourcing-Marketplace-App/supabase/functions/company-invitation-email/index.ts)
- [Push payload](../Salam-Sourcing-Marketplace-App/supabase/functions/send-message-push/push_payload.ts)

Existing review previews were under `/private/tmp/salam-ui-polish/`,
`/private/tmp/salam-brand-*.png`, `/private/tmp/salam-product-previews/`, and
`/private/tmp/salam-verified-reviews/`. They are temporary, sometimes synthetic,
and are not durable source artifacts. Use source/runbooks as the lasting baseline
and recapture visuals during implementation.

### Official integration guidance consulted

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side)
- [SSR session/caching considerations](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Turnstile hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)
- [Firebase web push](https://firebase.google.com/docs/cloud-messaging/web/get-started)

## Maintenance rule

Update this checklist as implementation and acceptance progress. Mark an item
complete only with relevant code and verification evidence, and record any
intentional scope difference. Keep recorded review evidence distinct from new
verification. New Flutter tap controls must include haptic feedback.

Keep phase order, dependencies and completion gates current. Mark a phase complete
only after its required checklist items and acceptance gate have evidence. Work
that spans phases must be rechecked as each dependent feature is introduced.

Phase 6 evidence and the exact deferred rollout sequence are recorded in
[phase_6.md](documentation/phase_6.md). Local checks and fixture layouts do not
replace the cross-platform acceptance matrix above.

Messaging follow-up: the silent HTTP phone-preview send failure is fixed locally,
and an in-page chat photo viewer is implemented. Regression and browser fixture
evidence is recorded in [Phase 4](documentation/phase_4.md#messaging-follow-up-http-preview-sending-and-photo-viewer).
Staging deployment and the real web ↔ Flutter messaging acceptance remain open.

Category/photo follow-up (2026-10-06):

- [x] Both clients show **All** plus categories containing visible published listings; empty taxonomy categories are omitted. Public preview and authenticated discovery share the availability query, with supplier/saved scopes on web.
- [x] Flutter refreshes category availability and resets a removed selection to All. Creation forms retain the full active taxonomy.
- [x] Flutter chat photos render inline and open a zoomable in-app viewer; private Storage authorization, error/retry states and haptics cover the new controls.
- [x] Shared migrations applied and checked: 393 backend checks, 104 Flutter tests, clean Flutter analysis, web tests/type checking/build and 348 HTTP checks.
- [ ] Deploy the updated web client and distribute a new Flutter build; verify a real cross-client photo conversation on devices.

Details: [category filters and Flutter photos](documentation/category_filters_and_chat_photos.md).
