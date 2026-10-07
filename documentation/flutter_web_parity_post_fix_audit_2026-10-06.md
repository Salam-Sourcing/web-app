# Flutter/web parity — fresh audit after the integrity fixes

Reviewed **2026-10-06**, against both current working trees, including their uncommitted fixes.

**Historical audit:** F01–F06 were subsequently corrected. See the [fix/release-system report](parity_release_system_2026-10-06.md); full live acceptance remains open.

**Not fully 1:1 yet.** All 37 Flutter screens have a web destination or equivalent workflow. Browser push remains the known deferred web capability. This fresh pass found six additional workflow/reliability findings, F01–F06. A matching screen or passing existing suite does not establish matching behavior through failures and large histories.

This was a read-only application/backend review. Only this report and the remaining-work reference were edited. Temporary isolated diagnostics were removed from the Flutter repository after execution. No customer records were read or changed, no live business actions were executed, and no application fixes, deployments, commits or pushes were made in this pass.

## Baseline and method

- Web HEAD: `9a3ed531da5ac666a60c34a3e5315e319258aead`, branch `1.0`.
- Flutter HEAD: `5a6332e80fe636d3e13c7e91b08322b0e62da2f4`, branch `1.0`.
- Both working trees contain the earlier [D/E corrections](parity_integrity_fixes_2026-10-06.md). Findings here apply to those working trees, not just the HEAD commits.
- Refreshed the 37-screen/21-repository inventory and compared routes, repository methods, server actions, shared widgets and client form behavior. Deep traces covered notification resolution, listing creation/review/retry, company creation, verification deletion, saved items, supplier catalogues and privacy/deletion failure states. Rechecked procurement fields/categories, quote paging/decisions, chat/captions/reporting/media, deal milestones/reviews, team permissions, billing, saved searches, support/export and MFA counterparts.
- Literal RPC extraction plus inspection of dynamic dispatch identifies 59 native names, 60 web names, 57 shared. Native listing review has an equivalent web status action; native block/unblock calls are dynamically selected on web. Native and web push registration differ intentionally. Public preview and unavailable-saved-listing retrieval use web-specific helpers. These counts are inventory evidence, not behavioral proof.
- Fresh hosted reads checked selected function definitions, policies, triggers, constraints and indexes. In particular, quote notifications reference **quote IDs**, verification Storage and metadata operations have separate transaction boundaries, and company creation has no natural-key/request-ID deduplication index.
- Reproductions used actual local repositories/widgets or the actual web notification resolver, with fixture HTTP/query responses. Fixture pagination caps are explicitly distinguished from the unknown current hosted Data API cap.

## Open findings

| ID  | Client  | Priority | Confirmed behavior                                                            |
| --- | ------- | -------- | ----------------------------------------------------------------------------- |
| F01 | Web     | High     | Quote notifications look up an enquiry using the quote ID.                    |
| F02 | Flutter | High     | Retrying a new listing after review failure creates another draft.            |
| F03 | Flutter | High     | Verification deletion removes file bytes before confirming metadata deletion. |
| F04 | Flutter | Medium   | Shortlist/supplier catalogue retrieval can stop at an API response cap.       |
| F05 | Flutter | High     | A safety query failure hides a successfully fetched pending deletion request. |
| F06 | Flutter | High     | Company creation can be repeated after an unknown write outcome.              |

### F01 — Web quote notification resolves the wrong record type

`src/lib/server/notification-target.ts:64` passes `entity_id` to `quoteBundle`. That helper expects an **enquiry ID**, while the hosted `submit_quote` function emits `entity_type='quote'` with the newly created **quote ID**. The final destination correctly uses `/quotes/<quote ID>`, but the preceding lookup can reject it before navigation.

**Reproduction:** a fixture notification referred to quote **901**, whose parent enquiry was **42**. Calling the actual resolver queried `enquiries.id=901`, never queried `quotes`, and rejected with `404 record_unavailable`. This was an isolated resolver reproduction, not a live notification interaction. Coincidentally matching quote/enquiry IDs can mask the defect.

Flutter resolves `quotes.enquiry_id` before opening enquiry detail with the selected quote (`marketplace_home_shell_screen.dart:198`). Web's own `/quotes/[id]` page also already performs the correct quote-to-enquiry lookup. Page RLS remains relevant; this finding does **not** demonstrate unauthorized disclosure.

**Required:** resolve the owned notification, then its RLS-visible quote and actual parent enquiry; validate the selected recipient company and effective buyer/supplier permissions; navigate to the single quote. Avoid loading a full comparison bundle merely to open one quote. Cover mismatched IDs, deleted quotes, different recipient companies and revoked roles.

**Backend:** existing quote/enquiry queries suffice. No schema change identified.

### F02 — Native listing retry loses a successfully created draft

`seller_listings_repository.dart:146` inserts a draft, uploads images, optionally submits review, and returns the draft ID only after all steps succeed (`:177`). `create_listing_screen.dart:234` chooses create/update from `widget.initialListing`; it stores `_createdListingId` only after the repository returns and re-enables submission after an exception.

**Reproduction:** actual native `createListing` was called twice with no images and review submission requested. Each mocked insert succeeded; each review request rejected. The calls were:

```text
insert listings → draft 1 → review rejected
insert listings → draft 2 → review rejected
```

The fixture confirms two creates through the current repository. Screen inspection confirms retry uses the same new-listing branch. No production duplicate was created. An image upload failure can also interrupt the same post-create sequence; that branch was source-reviewed rather than separately reproduced here.

Web retains `form.dataset.listingId` before uploads/review (`src/scripts/catalog-forms.ts:225`) and tracks successfully attached files. It also stops an uncertain initial create and provides a Sell destination.

**Required:** retain the ID immediately, expose the saved draft, resume only incomplete uploads, reconcile publication state and distinguish confirmed rejection from an uncertain create/review acknowledgement. Test new listings, edits, a later image failure and lost review responses. Do not apply RFQ retry protection to listings by assumption: they use different creation paths.

**Backend:** retaining the known draft needs no schema change. Transparent automatic retries of an unknown initial insert would require request-ID deduplication/reconciliation; alternatively stop and check existing listings.

### F03 — Native verification removal still uses unsafe ordering

`company_profile_repository.dart:207` removes Storage bytes first, then deletes `verification_documents`, without selecting/confirming the deleted row or using the cleanup journal. This differs from the repaired native enquiry-file path and from web `removeDocument` (`src/lib/server/uploads.ts:661`), which deletes and confirms metadata before claiming cleanup.

**Reproduction:** the actual native repository received a successful Storage removal response followed by a rejected metadata DELETE. It threw after requesting file deletion first. Thus a metadata failure can leave a reference to an already removed file. The fixture validates ordering and partial-failure handling; it does not delete a real document.

Fresh hosted metadata shows verification Storage deletion and metadata deletion each enforce editable status/locking, but they are **separate requests/transactions**. These locks do not make this client sequence atomic. The current cleanup RPC already recognizes verification-file references and can return retained/claimed/gone. Removing another manager's file also requires respecting uploader ownership; the UI's ability to show a document does not grant ownership of its Storage object.

**Required:** confirm authorized metadata removal first, then use owner-aware claimed cleanup and persistent recovery. If removal is denied, the file must remain intact. Cover submission/role changes between requests, a zero-row DELETE, lost acknowledgement and cleanup failure. Preserve pending/approved verification locks.

**Backend:** the existing cleanup contract supports the client correction. Recheck isolated race tests; do not loosen Storage ownership or retention rules to make deletion succeed.

### F04 — Native saved IDs and supplier listings have incomplete retrieval paths

Two distinct paths need correction:

1. `shortlist_repository.dart:25` requests 1,000 rows and stops whenever the returned batch has fewer than 1,000. It does not request/check the total or advance by the actual batch length. With a lower configured API cap, a short response is incorrectly treated as the end.
2. `listings_repository.dart:87` retrieves a supplier's published listings in one unpaginated request. `public_company_profile_screen.dart:45` uses this result without a completeness or next-page state. A supplier catalogue larger than the server cap is truncated even if the cap is 1,000.

**Reproductions:** actual native shortlist and supplier-listing repositories each received **75 rows with `Content-Range: 0-74/1201`**. Each returned 75 items and issued only one corresponding table query. The supplier path also fetched the company summary as expected. The fixture cap of 75 is **not** a claim about the hosted project's configured limit. The shortlist defect requires a cap below the requested 1,000; the supplier defect requires a catalogue larger than whatever cap applies.

Web saved suppliers and supplier catalogues have page navigation through `savedSuppliers` and `CatalogFeed`. Native normal Discover already has paging; this finding concerns the different supplier-profile retrieval path. Missing saved IDs affect bookmark state, unavailable-item removal and saved supplier pagination.

**Required:** count/cursor-aware saved-ID retrieval and paged supplier catalogues, stable ordering, explicit failure/completeness states and removal of unavailable items without exposing hidden records. Test a cap below the requested size, more than one cap, empty final batches, repeated timestamps and concurrent changes. Add haptics to new native paging/retry controls.

**Backend:** existing authorized query interfaces support basic pagination. Confirm deployed row limits and performance. Do not raise a global row cap as the only fix.

### F05 — Native privacy failure can hide account-deletion cancellation

`privacy_safety_screen.dart:33` combines blocked-company and deletion-state loads in `Future.wait`. If either fails, it only clears `_loading`, retaining default empty/null data. It shows “You have not blocked any companies.” and offers deletion scheduling without an error or retry.

**Reproduction:** the actual widget received a failed blocked-company request and a **successful pending deletion request**, scheduled for 2026-10-31. It nevertheless displayed the empty-blocks text and “Schedule account deletion”; “Cancel account deletion” and Retry were absent. This confirms a successful deletion result is discarded when the other section fails, not merely a cosmetic error message problem.

Web `/account/safety` distinguishes failures for the two queries and conditionally exposes the pending request's cancellation action. Existing backend state remains authoritative; this reproduction did not schedule, cancel or execute deletion.

**Required:** load/present the two states independently; distinguish unknown from empty; retain a successfully loaded pending deletion request and its cancellation control. Add haptic retry controls, and do not enable scheduling/cancellation based on default null data after failure. Cover initial load, refresh, one-section failure, pending/processing/failed deletion and revoked sessions.

**Backend:** no schema change identified.

### F06 — Native company creation retries an unknown insert

`company_profile_repository.dart:19` directly inserts a company without a request identity. `company_onboarding_screen.dart:100` catches failure, re-enables submission and does not distinguish a lost response after commit from a rejected insert. Its next submission calls create again.

**Reproduction:** the actual native repository was called twice against a fixture that recorded a simulated committed create and then threw a lost-response `ClientException`. Both calls attempted `POST /rest/v1/companies`. This establishes the repeated-write behavior under an unknown outcome, **not two live committed companies**.

Fresh hosted constraints/indexes show only `id` is unique; owner, display name and registration number do not provide deduplication. The insert write-budget trigger limits volume rather than identifying retries. Web's generic company form handles network/5xx uncertainty by disabling further submission and linking to Account/company selection (`src/scripts/forms.ts:293`). The prior request-ID backend correction covers enquiry/quote RPCs, not this direct company insert.

**Required:** distinguish known rejection from uncertainty, offer a company-list reconciliation path, and prevent blind repeat creation. If the desired UX includes transparent retries, add actor/request-scoped backend deduplication and use it in both clients; names alone must not be a retry key. Test lost acknowledgement, unchanged retry, changed payload, account switch and legitimate multiple-company creation.

**Backend:** stop-and-check behavior needs no schema change. Automatic exactly-once retry needs an additional shared backend contract.

## Refreshed screen map

This table records availability and source counterparts. “Counterpart” does not mean every live role/device/failure journey passed. Native entries are filenames in `lib/presentation/screens/`.

| Flutter screen                     | Web counterpart                                 | Audit note                                                          |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `accept_company_invitation_screen` | `/invitations/[id]`                             | Preview, confirmation, acceptance and role/seat enforcement.        |
| `account_settings_screen`          | `/account` and billing/preferences/security     | Settings and plan request counterparts; push deferred.              |
| `auth_screen`                      | `/login`, `/signup`, `/forgot-password`         | CAPTCHA, confirmation, login and field contracts.                   |
| `buyer_dashboard_screen`           | `/enquiries/dashboard`                          | Counts, enquiry and deal continuation.                              |
| `company_onboarding_screen`        | `/company/new`                                  | F06 unknown creation outcome.                                       |
| `company_profile_screen`           | `/company`, `/company/edit`                     | Fields, verification states/documents; F03 deletion.                |
| `company_team_screen`              | `/account/team`, `/account/team/[id]`           | Roles, restrictions, invite/revoke, company selection.              |
| `create_enquiry_screen`            | `/enquiries/new`, `/enquiries/[id]/edit`        | Earlier category/numeric/draft retry corrections present.           |
| `create_listing_screen`            | `/sell/new`, `/sell/[id]`                       | Specifications, media, retired category/legacy lead; F02 retry.     |
| `deal_progress_screen`             | `/deals/[id]`                                   | Milestones, tracking/delivery, documents, completion/review.        |
| `direct_enquiry_screen`            | `/enquiries/new` with supplier/listing context  | Buyer permission, currency/context and request identity.            |
| `discovery_home_screen`            | `/discover`                                     | Search/sort/filter/category/paging; public `/` is web-specific.     |
| `enquiries_screen`                 | `/enquiries`                                    | All/mine/saved, search and related-company visibility.              |
| `enquiry_detail_screen`            | `/enquiries/[id]`, `/quotes/[id]`               | Attachments, invitations, history/decisions and error state.        |
| `legal_document_screen`            | Legal/help/verification pages                   | Production content acceptance still needed.                         |
| `listing_detail_screen`            | `/listings/[id]`                                | Specifications/images, supplier, save/report/direct enquiry.        |
| `manage_listing_screen`            | `/sell/[id]`                                    | Edit/review/status and moderation feedback.                         |
| `marketplace_home_shell_screen`    | `AppLayout` and workspace boundary              | Navigation/company/notification routing; web F01.                   |
| `marketplace_pdf_screen`           | Enquiry/quote/deal export and preview routes    | Earlier shared comparison bounds; device PDF acceptance open.       |
| `message_photo_screen`             | In-page chat image viewer                       | Embed, zoom/pan/reset/retry and private media handling.             |
| `message_thread_screen`            | `/messages/[id]`                                | Text/outbox, history, captions/files/report/archive/profile link.   |
| `messages_screen`                  | `/messages`                                     | Active/archived, search/paging, preview/unread/freshness.           |
| `notification_settings_screen`     | `/account/preferences`                          | Category preferences present; browser push deferred.                |
| `notifications_screen`             | `/account/notifications`, notification resolver | Latest 100/full unread count; F01 quote opening.                    |
| `privacy_safety_screen`            | `/account/safety`                               | Blocking, deletion/cancellation; F05 native false-empty state.      |
| `profile_information_screen`       | `/account/profile`                              | Names/contact/country/email confirmation/account metadata.          |
| `public_company_profile_screen`    | `/suppliers/[id]` and reviews                   | Profile verification explanation and reviews; native F04 catalogue. |
| `quote_comparison_screen`          | `/enquiries/[id]/compare`                       | Revision/status, terms, buyer decisions and bounded export.         |
| `reset_password_screen`            | `/auth/callback`, `/account/password`           | Password bounds, secure reset/reauthentication flow.                |
| `saved_marketplace_screen`         | `/saved`                                        | Listings/suppliers/unavailable removal; native F04 IDs.             |
| `saved_searches_screen`            | `/account/searches`, `/account/searches/[id]`   | Save/matches/delete/alerts; web also edits filter fields.           |
| `sell_screen`                      | `/sell`                                         | Status groups, listing management and insights.                     |
| `submit_quote_screen`              | `/enquiries/[id]/quote`                         | Currency/terms/optional lead/validity and request identity.         |
| `supabase_bootstrap_screen`        | Middleware/access/session/callback handlers     | Session/MFA/account boundary; device acceptance remains.            |
| `supplier_insights_screen`         | `/account/insights`                             | Period metrics and listing activity.                                |
| `support_requests_screen`          | `/account/support`, personal export             | Replies/versioning, appeals, ownership requests, bounded export.    |
| `two_factor_screen`                | `/auth/mfa`, `/account/security`                | Enrollment, QR/manual key concealment/copy, verify/remove.          |

## Evidence and remaining acceptance

Fresh checks in this pass:

- **173/173 existing web tests passed.**
- **157/157 existing Flutter tests passed.**
- **Six native diagnostic cases reproduced** listing creation/review retry, verification delete ordering, capped saved IDs, privacy partial failure, capped supplier listings and uncertain company creation.
- **One web diagnostic reproduced** quote/enquiry ID confusion in the actual notification resolver.
- Both repository diffs passed whitespace checks; temporary native diagnostics were removed.
- Hosted reads were metadata-only. No current Data API cap, customer catalogue size or real duplicate/file-loss incident was inferred from fixture data.

The diagnostic passes assert defects; they do not mean those defects are fixed. Earlier build/analyzer/425 isolated PostgreSQL/354 HTTP evidence is in the D/E fix report. Those checks were **not rerun** as part of this source/documentation-only audit.

Remaining acceptance must include real web ↔ Flutter buyer/supplier journeys, all effective roles, multi-company notices, expired/revoked sessions, Back/reload/another tab, device layouts/photo/file viewers, interrupted uploads, lost acknowledgements and concurrent state changes. In particular, native notification records currently do not carry `recipient_company_id` into their model; exercise users belonging to multiple participating companies and require the correct recipient context before closing that acceptance gate. This context concern was source-reviewed here, not reproduced as an additional F finding.

Also retain the existing browser-push deferral, invitation-email rollout lock, staging deployment/native distribution, production alert/log verification, final legal content and final plan details. Public indexable pages and private-route exclusions need production-domain acceptance. These are release/intentional-scope items, not evidence that every one is a missing Flutter-to-web screen.

Fix in this order: **F03 file integrity → F05 deletion state → F01 notification routing → F02/F06 creation recovery → F04 completeness**, then repeat the cross-client acceptance matrix. New native tap controls require haptic feedback under the user's AGENTS instruction. Track status in [remaining work](../remaining_work.md); do not reopen historical D/E findings merely because these additional paths remain.
