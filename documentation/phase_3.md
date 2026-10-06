# Phase 3 — enquiries, quotes and messaging

Implemented and inspected on **2026-10-05** at the user's request. Earlier live
acceptance gates remain open. The initial phase changed no database migration,
Storage/RLS policy, Realtime publication, Auth configuration, Edge Function or
Flutter source. The subsequent user-authorized [concurrency follow-up](concurrency_fixes.md)
applied a shared backend migration and updated web/Flutter attachment retries.

## Delivered functionality

- All/My/Saved enquiries with search, category, status, urgency and pagination;
  public RFQs and direct supplier/listing enquiries with guarded company context.
- Requirements, quantity/unit, delivery, currency, deadline, visibility and urgency.
  Manual server drafts, edit/resubmission, moderation states and rejection reasons.
  Currency is fixed after creation because the current update RPC cannot change it.
- Supplier invitations, private enquiry attachments and removal, close/cancel
  confirmations, current verification/permission/deadline checks. Shared RLS,
  blocked-company, quota and moderation rules remain authoritative.
- Supplier quote submission and revision with unit/total price, lead time,
  validity, notes and payment/shipping terms. Withdraw/reject/explicit accept use
  existing RPCs. Acceptance reports the resulting shared deal ID; deal fulfillment
  is Phase 4.
- Comparison retains original currencies, newest/price-within-currency/lead-time
  ordering, supplier verification/reviews, unavailable information, expiry,
  version/status, terms and supplier/quote navigation.
- Single/all authorized quote PDF downloads with Inter, UTC generation time,
  A4 pagination and wrapped long notes. PDFs are private, uncached downloads.
- Active/archived company conversations and search, preview/time/unread counts
  with 99+, enquiry/product context, chronological timestamp/ID history,
  read/seen state, text and private attachments.
- Server-side user-authorized Realtime subscriptions relayed as same-origin SSE
  invalidations. Messages/list refresh on events, reconnect/resume and a 30-second
  fallback. Missed messages are caught up in 50-row cursor batches. No fabricated
  online presence or persistent browser outbox.
- Failed text sends retain their original request ID and explicit Retry action.
  A new draft typed after failure survives acknowledgement of the old message.
  File retries reuse the upload/message key and existing upload recovery system.
- The global verification badge is removed. Supplier/business verification remains
  contextual. The company dropdown appears only with multiple memberships, with
  aligned selector/Switch controls. Heading descriptions/actions, responsive
  spacing, enquiry cards, settings dividers and message surfaces are consistent.
  Mobile comparison scrolls inside the table without widening the page.

## Refreshed hosted contract

Read-only inspection and generated types target the same project,
stjtdlwonexcgnhmgfqw, and the current hosted schema.

The port reuses create_enquiry, update_enquiry_draft,
submit_enquiry_for_review, invite_supplier_to_enquiry, close_enquiry,
submit_quote, withdraw_quote, reject_quote, accept_quote,
mark_conversation_read, public company summary/profile RPCs, and
claim_upload_cleanup.

Inspected can_access_enquiry, can_access_quote, conversation/message RLS,
active-user/MFA restrictions, participant scopes, verification/blocked-company
triggers, monthly enquiry limits and upload reference rules. Existing private
enquiry/message buckets allow PDF/JPEG/PNG/WebP below 10 MB. The existing
Realtime publication includes conversations/messages. Text messages already have
the unique (sender_user_id, client_message_id) retry key.

Web actions recheck the current user, MFA, company membership/effective scope and
record state. Identity and status fields are server controlled. Mutation requests
require same-origin bounded JSON/multipart. API/media/export responses are
no-store. Private files are downloaded through guarded same-origin endpoints and
Storage RLS; browser content never receives the Realtime JWT. Streams periodically
revalidate access and send record identifiers rather than complete business rows.

## Retry and compatibility boundaries

Manual creation/submission is not automatically repeated after an ambiguous
first response: the existing enquiry/quote creation RPCs have no creation
idempotency key. Users are directed to check their enquiry records. Confirmed
draft IDs and completed file attachments are reused for subsequent steps.

Quote revision creates a new version through the existing RPC. Earlier sent
versions remain active until explicitly withdrawn, matching the shared contract.
The web does not silently perform a separate withdrawal transaction.

The upload journal is a bounded HttpOnly browser-session cookie, not durable
global storage. Immutable byte uploads, matching-byte reconciliation and the
reference-aware cleanup claim are retained from Phase 2. Failed/unconfirmed
cleanup preserves the intent; attached business objects are retained.

**Concurrency follow-up resolved:** the shared backend now enforces unique
message attachment paths, checks enquiry state under lock during acceptance,
and enforces five images under the listing lock. Both clients use these guards;
web/Flutter retry changes and verified evidence are in
[concurrency fixes](concurrency_fixes.md).

**Remaining scale/export considerations:**

- Large related-enquiry/search ID lookups retain the hosted API/summary RPC row
  limits. Validate accounts with more than the default response limit; fully
  scalable company-name search may need an additive backend search contract.
- Comparison fetches quote pages rather than silently showing only the first
  database response; it explicitly refuses an exceptionally large set of 5,000
  or more versions. All-quote PDF export explicitly caps 500; individual exports
  remain available. Unsupported Inter glyphs return a clear error rather than
  exporting omitted characters. Wider-script font coverage belongs with Phase 4
  document presentation.

**Initial Phase 3 porting reused the backend.** The subsequent concurrency
hardening required the shared migration recorded above. Browser-specific setup
and signed-in staging acceptance remain open.

## Verification evidence

- npm test: **75 passing isolated tests** after the concurrency follow-up covering existing security boundaries
  plus enquiry/quote payload authority, numeric/calendar/deadline validation,
  verification and scopes, invitation/closed/expired guards, explicit acceptance,
  draft locks/currency, combined conversation company/search restrictions,
  timestamp precision/history/deduplication, immutable text retry IDs and
  acknowledgement, file ownership/limits, quote pagination and PDF pagination.
- npm run check: **0 errors, 0 warnings**, one pre-existing unused callback hint.
- npm run build: successful Cloudflare production bundle including the PDF font.
- npm audit: **0 vulnerabilities** after updating the affected transitive
  smol-toml and source-map-js versions. Direct Supabase versions remain pinned.
- Production preview HTTP smoke: **212 assertions passed** for public/private
  routes, authentication, no-store, cross-site mutation rejection and CSP.
- Isolated UI fixture outside production source used the actual components,
  pages and scripts at 1280 and 390 pixels. It was visibly labelled fixture data;
  no authentication bypass was added to production.
- Zero/one/multiple company layouts checked. Single-company selector/global badge
  absent; multiple-company selector and button both 42 px high and aligned.
  Mobile RFQ form/thread/comparison have no page overflow; comparison table
  scrolls independently.
- Older message history grew from 50 to 62 unique messages. A fixture send that
  inserted a message but returned an error was retried: one matching message
  remained and the new draft survived. This exercises isolated local data, not
  the hosted Realtime connection.
- All four pages of a long two-quote PDF sample were rasterized and visually
  inspected. A font-subsetting missing-glyph defect was found and corrected by
  embedding the full font. Single/all route authentication is covered by HTTP
  smoke; authorized fixture export returned PDF download/privacy headers.

No test created accounts, sent emails, uploaded live files, accepted real quotes,
changed business records. Flutter source was updated in the subsequent concurrency follow-up.

## Live acceptance still required

1. Finish earlier staging Auth/MFA/CAPTCHA/domain and catalog gates.
2. Create RFQ on web, review/publish it, quote in Flutter, send text/files in both
   clients, compare/accept on web, and confirm the same deal and quote statuses.
3. Exercise direct listing/supplier enquiry, invited-only RFQ, rejected draft
   resubmission, quote revisions/withdrawal/rejection/expiry and close/cancel.
4. Verify unverified/blocked companies, restricted members, monthly limits,
   revoked permissions/company switching and inaccessible private files.
5. Test real uploads, lost acknowledgements, concurrent actions and recovery;
   verify the deployed concurrency guards in the actual web/Flutter release.
6. Verify actual Realtime/SSE streaming, subscription cleanup, reconnect/resume,
   read/seen updates and missed history on deployed Cloudflare. The isolated
   fixture and unsigned production smoke do not prove signed-in edge streaming.
7. Download single/all exports using real authorized accounts and check private
   supplier visibility, large records and glyph coverage.

Implementation checkboxes in [remaining_work.md](../remaining_work.md) are checked;
the cross-client completion gate remains unchecked. Phase 4 is the next feature
phase: deal milestones, private deal documents, completion and reviews.
