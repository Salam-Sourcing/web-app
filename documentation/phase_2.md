# Phase 2 — company, catalog and discovery

Implemented and inspected on **2026-10-05**. Phase 2 implementation proceeded at
the user's request; Phase 1 staging acceptance is still open. No database,
Storage policy, Edge Function, Auth configuration or Flutter source was changed.
The code is locally verified; the live cross-client completion gate is unaccepted.

## Implemented

- Company onboarding with details/contact/location/review and representation
  confirmation; creates an active unverified company owned by the signed-in user.
  Profile edits use the existing guarded update RPC.
- Separate company verification drafts, private document upload/download/removal,
  submission, pending/approved/rejected/expired states and rejection reasons.
  Pending documents are locked. PDF/JPEG/PNG/WebP must be smaller than 10 MB.
- Sell overview with real selected-company status counts and pagination; product
  and service creation/editing, active taxonomy, specifications, price/unit/MOQ/
  lead time/origin, manual server drafts and review steps.
- Five-image maximum including existing images; JPEG/PNG/WebP smaller than 5 MB;
  immutable uploads with existing cover and display order retained.
- Submit/resubmit, pause, resume and archive through existing moderation RPCs.
  Editing published/paused records returns them to draft. There is no client
  approval or publication shortcut.
- Live authenticated discovery, exact category values and Flutter's category
  icon mapping; location/currency/price/MOQ/lead-time/verified filters; newest/
  price/lead-time sorting with original currency grouping and no conversion.
- Existing 24-result contract, debounced search, abort/generation protection,
  deduplication, retained results after failures, retry and load-more.
- Authorized listing galleries/details and supplier summaries/listings/review
  totals. Saved listings/suppliers persist privately per user; inaccessible saved
  suppliers can be removed. Save state changes only after server confirmation.
- Reporting/blocking navigation and guarded contact-supplier navigation.
  Contact opens an honest availability screen; **enquiry creation is Phase 3**.
  Supplier insights has a guarded entry point; its implementation is Phase 5.
- Flutter brand colors, Inter, card hierarchy and 16:9 images, top verification
  badge, raised gradient category pills/icons, responsive forms/grids and visible
  tap/busy/error feedback. Flutter was inspected read-only; no new Flutter taps.

## Refreshed database evidence

The shared project remains `stjtdlwonexcgnhmgfqw`. Generated types were refreshed
from the hosted database, including the now-deployed `admin_operations` migration
`20261005185937`. Earlier Phase 1 notes describe the state at their inspection time.
Local/remote timestamp drift remains documented for marketplace/procurement/
scheduler migrations; no migration was applied to resolve it.

Read-only catalog/policy/function inspection confirmed Phase 2 uses existing
`search_marketplace`, `get_public_company_profile`, `update_company_profile`,
`create_company_verification`, `submit_company_verification`, `update_listing`,
`set_listing_status`, `record_marketplace_listing_view` and
`claim_upload_cleanup` contracts.

Storage bucket metadata was rechecked: `listing-images` and
`company-verification-documents` both have `public=false`; caps are 5,242,880 and
10,485,760 bytes, respectively. MIME allowlists match the client restrictions.
The website preserves Flutter's strict smaller-than limit rather than allowing
a file at the exact cap.

A further read-only check of `private.track_listing_images`,
`private.validate_listing_image_reference` and `private.authorize_storage_write`
confirmed revision/ownership locks and existing storage write/byte budgets.
At the Phase 2 inspection, Flutter and web preflight/attachment reads checked the
five-image limit, but the database did not enforce an atomic cap. Concurrent
requests could exceed that application limit. It was subsequently fixed by the
user-authorized shared migration in
[concurrency fixes](concurrency_fixes.md); the database now enforces the limit
under the listing lock for web and Flutter. Release acceptance remains open.

**No backend change was made for this Phase 2 implementation.** Reusing
Flutter's backend does not remove web-specific work: fresh session/MFA/company
checks, same-origin mutations, cookie boundaries, private media delivery, safe
rendering and browser retry behavior are implemented on the website. This is not
a guarantee that every future integration or deployment needs zero backend setup.

## Security and recovery

All pages/actions use Phase 1's current authenticated workspace and effective
permissions. Selected-company IDs are compared on mutations. User identity,
company ownership, moderation status and approval are never accepted from form
payloads. Server clients use user JWTs and publishable configuration; no
service-role client is introduced. Backend RLS, quota/moderation triggers and
Storage rules remain authoritative.

Private images and documents go through authenticated same-origin media routes.
Each request rechecks access and downloads through Storage RLS; no raw private
paths or reusable signed URLs are placed in the feed. Documents download as
attachments. API/media/private responses remain no-store at browser/CDN level;
production Astro CSP hashes are preserved. Image previews allow local blob URLs.

Before file upload, a bounded HttpOnly session-cookie recovery intent records a
server-generated user/target/UUID path. Repeat uploads never overwrite objects.
An uploaded-but-unattached object must have matching SHA-256 bytes before reuse.
An already-attached file can be acknowledged after a lost response without
creating another object. Unjournaled new uploads are denied.

Cleanup waits 24 hours and uses the existing reference-aware cleanup claim.
Objects are removed only after `claimed`; `retained` business objects are kept;
unconfirmed cleanup keeps the intent. The journal is bounded to ten intents,
cleared on logout and can be lost when browser-session cookies are lost.
It is not a durable global orphan sweep. Private document metadata removal
reports a storage-cleanup warning when byte removal cannot be confirmed,
including documents uploaded by another authorized company member.

Once a draft ID is returned, later image/review retries reuse it and skip files
already confirmed attached. The backend has no client creation-idempotency
column. A lost/ambiguous first company/listing creation response therefore blocks
automatic creation retries and directs the user to check existing records.
Forms are manual server drafts; there is no localStorage autosave of private data.

## Verification evidence

- `npm test`: **46 passing isolated tests**. Existing Auth/MFA/CSRF/account
  regression checks are retained. Catalog tests cover payload whitelisting,
  numeric/filter bounds, exact search RPC contract, company/scope drift,
  moderation transitions, file signature/size checks, storage-path confinement,
  pagination deduplication, foreign-owner journal rejection, retained-file
  cleanup, cleanup failures, missing journals and lost upload acknowledgements.
- `npm run check`: **0 errors, 0 warnings**, one existing Astro callback hint.
- `npm run build`: production Cloudflare build succeeds.
- Production preview HTTP smoke: **150 assertions pass**, including all new
  private routes, catalog/upload/media authentication, no-store, foreign-origin
  mutation rejection and production CSP preservation.
- Isolated component fixture outside the production source, tested in the
  browser at 1280 pixels and 390 pixels. Cards, company details/contact/review,
  listing details/terms/review and dynamic specification fields were inspected.
  Mobile scroll width equals viewport width; review steps preserve entered data.
  Fixture sample records are not a live account or Auth bypass. It submitted no
  company, listing, verification, enquiry or save mutation to the shared backend.
- No test created real accounts, sent email, uploaded live files, approved a
  listing/verification or changed business records.

## Remaining acceptance gate

Using controlled signed-in buyer/supplier accounts on staging:

1. Finish Phase 1 email/CAPTCHA/MFA/domain acceptance.
2. Create/edit a company and follow draft → pending → approved/rejected
   verification in both clients, including verified-identity changes.
3. Create/save/edit/submit listings; exercise moderation and pause/resume/archive
   and confirm discoverability in Flutter. Verify listing quotas and revoked
   permissions with existing backend policies.
4. Exercise actual image/document upload, partial failures, lost responses,
   limits, concurrent actions and reference-aware cleanup. Verify other-member
   document removal and locked reviews.
5. Search/filter/sort/paginate real records and save/unsave from web and Flutter;
   check inaccessible/blocked suppliers and network failure states.
6. Change selected company, role, verification, account status and MFA on another
   client; confirm page invalidation and private media denial as applicable.
7. Complete supplier enquiry submission/quota acceptance in Phase 3.

These checks are deliberately not marked passed from mocks, source inspection
or unauthenticated HTTP smoke alone. See [remaining work](../remaining_work.md).

## Access overlay follow-up

Routine session checks now run in the background. Fresh server-rendered pages do
not immediately repeat verification, and repeated focus/brief visibility changes
reuse the recent result. The 30-second background check remains; returning after
60 seconds without verified access locks the page until revalidation succeeds.
Verification outages/offline state still lock it, while invalid sessions, MFA,
revoked access and company/permission changes discard or redirect private content.
In-flight responses are cancelled/ignored after offline, logout or navigation.
Dedicated regression tests cover quiet checks, draft preservation and these
failure/invalidated-response cases. Server and backend access checks are unchanged.

Follow-up verification: 55 tests pass, type check reports no errors/warnings,
production build succeeds and 132 local HTTP assertions pass. An isolated browser
fixture confirmed the overlay stayed hidden and the input remained editable during
a pending check; the entered text survived the confirmed response. Live account
acceptance remains separate.
