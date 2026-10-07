# Flutter/web parity — independent second pass, 2026-10-06

> **Implementation update:** The findings below describe the pre-fix audit baseline. Their D/E implementation issues are now addressed; see [the fix and verification report](parity_integrity_fixes_2026-10-06.md). Browser push and full release acceptance remain outstanding.

**Still not fully 1:1.** This pass confirmed four additional issues (E01, E03, E04, E06) and strengthened two previously recorded findings (E02, E05). These are open findings, not completed fixes. Browser push remains deferred.

The important correction to the preceding report is that **fractional quantity handling is a shared client/database contract issue, not merely a Flutter display issue**. Exact hosted column types were checked this time; the distinction is explained under E02.

## Baseline and scope

- Web commit: `9a3ed531da5ac666a60c34a3e5315e319258aead`, branch `1.0`.
- Flutter commit: `5a6332e80fe636d3e13c7e91b08322b0e62da2f4`, branch `1.0`.
- Application code has not changed since the [preceding 37-screen/21-repository comparison](flutter_web_parity_current_recheck_2026-10-06.md). Its seven D findings remain open, with D05 refined below.
- This pass independently followed RFQ draft/review/retry, listing edit initialization, numeric form-to-payload-to-database conversion, quote retrieval/comparison limits, and enquiry detail error presentation. It also reread direct enquiry/quote submission, billing, saved searches, milestone submission, private media handlers and generic form uncertainty handling.
- Hosted reads inspected business RPC definitions, numeric column types and relevant CHECK constraints. Arithmetic SELECTs tested rounding and overflow. No customer rows were read or written; no business RPC was executed against the live backend.
- All runtime reproductions used actual local application code with isolated fixture widgets or mocked HTTP responses. No signed-in browser mutations were performed. This pass did not repeat real-device visual acceptance or all live role journeys.

Native `lib/` paths refer to the sibling Flutter repository. Web `src/` paths refer to this repository. Source anchors apply to the commits above.

## E01 — Flutter RFQ retry can create a second draft

**New finding. Priority: high. Native partial-failure handling differs from web.**

`lib/data/repositories/enquiries_repository.dart:221` creates a draft, then submits it for review, and returns the ID only after both operations succeed. `CreateEnquiryScreen` passes only `widget.initialEnquiry?.id` (`lib/presentation/screens/create_enquiry_screen.dart:143`). A newly created screen does not retain the successful create ID when review submission fails; its catch re-enables submission.

**Reproduction:** the actual native repository received successful draft IDs from the mocked create RPC, followed by rejected review RPC responses. Repeating the new-record save produced:

```
create_enquiry → draft 1 → review rejection
create_enquiry → draft 2 → review rejection
```

This establishes the known-success/failed-second-step duplication path, not a live customer duplicate. The hosted create function inserts a new enquiry on each call; it has no client request-ID deduplication argument. A duplicate also counts toward the monthly enquiry limit.

Web's procurement form retains `createdId` before attaching files or requesting review (`src/scripts/procurement.ts:125` onward). It retries a known draft rather than automatically creating another, and locks an uncertain initial create outcome with a link to My Enquiries.

**Required:** preserve the native successful create ID before requesting review, reconcile the actual draft/publication state before retry, and distinguish failed submission from uncertain creation. Add a saved-draft destination and avoid blindly retrying non-idempotent creates.

**Backend implication:** fixing this known-ID path can use existing RPCs. Transparent safe retries after a genuinely lost create acknowledgement would need backend idempotency/reconciliation or a deliberate client stop-and-check flow. Do not infer that message retry IDs already protect business-record creation. Native quote/direct-enquiry creation also needs lost-acknowledgement acceptance; those broader cases were source-reviewed, not separately reproduced here.

## E02 — Both clients accept numbers outside the actual storage contract

**Expanded/corrected D05. Priority: high. Shared validation and persistence mismatch.**

Fresh hosted column metadata shows:

| Business field                 | Hosted type     |
| ------------------------------ | --------------- |
| RFQ quantity                   | `numeric(14,2)` |
| Listing price per unit and MOQ | `numeric(14,2)` |
| Quote price per unit and total | `numeric(14,2)` |

Both clients allow positive RFQ quantities with more than two decimal places and numeric values up to **1,000,000,000,000 inclusive**. Web payload diagnostics accepted `quantity: 0.001`, listing price `1.2345` and the inclusive upper endpoint. The actual native RFQ field validator accepted `0.001` and `1000000000000`.

Read-only hosted SQL established:

- `0.001::numeric(14,2)` becomes `0.00`.
- `1.2345::numeric(14,2)` becomes `1.23`.
- `999999999999.99` is representable.
- `1000000000000::numeric(14,2)` fails with numeric overflow (`22003`).

The RFQ quantity CHECK requires the **stored** value to be greater than zero. Therefore a new quantity of `0.001` is accepted locally but would fail that CHECK after rounding. For listing prices/MOQ and quote totals, the inspected checks allow zero, so extra decimal places can change the stored amount without a corresponding precision warning. The quote web form has `min="0.01"`, whereas the native quote validator and web payload helper accept smaller positive totals; the hosted quote total check is `>= 0`.

**Correction to the earlier report:** the native model formatter really does turn an in-memory `0.001` fixture into “0 units.” However, the preceding display-only assessment did not inspect the column scale. It did not establish that a persisted RFQ currently contains `0.001`, and changing the Flutter formatter alone will not solve the submitted-data problem. Web also loses precision through storage. No real insert or update was used to test this.

**Required:** define and enforce the supported precision and exact representable bounds across both forms, payloads, server/business contracts, details and PDFs. Explain rounding before confirmation or reject unsupported precision. A positive quote total should remain positive after persistence. Test decimal boundaries, zero, scientific notation, overflow and cross-client editing.

**Backend implication:** aligning clients to the current two-decimal storage needs no scale migration. If the product must support quantities such as `0.001`, the quantity schema and dependent functions/exports need a deliberate precision change. Enforcing positive quote totals at the backend after rounding is additional integrity work; it is not accomplished by changing a client label.

## E03 — Flutter replaces an unavailable listing category without asking

**New finding, separate from RFQ D03. Priority: high. Existing-record preservation.**

`CreateListingScreen` restores the stored category only if present in the supplied taxonomy. Otherwise it falls back to the first available category and its first subcategory (`lib/presentation/screens/create_listing_screen.dart:81`, `:89`). Active-category retrieval omits retired categories/subcategories. The ordinary save payload then uses that newly selected ID (`:194` onward).

**Reproduction:** the actual edit screen received an existing listing with subcategory ID 1 and current taxonomy containing only subcategory ID 2. Its subcategory field initialized to ID 2 without any user selection. The test inspected the initialized control; it did not save a live listing.

Web's edit form instead has a required placeholder when the existing ID is absent, and the server rejects nonactive category IDs (`src/components/ListingForm.astro:51`, `src/lib/server/catalog-actions.ts:108`). It prevents silent replacement but cannot preserve a retired category while editing unrelated fields.

**Required:** retain the stable stored category, explain unavailable/retired selections, and require an explicit replacement decision. Decide whether unrelated edits may preserve the old ID; apply that policy in both clients. Test empty taxonomy, retired parent/child, deleted/unavailable selection and unchanged edits. Keep category availability filtering for new listings.

**Backend implication:** the inspected update function and existing foreign key already carry category IDs. No schema migration is identified for preserving an existing inactive ID, although client/server active-category gates must implement the agreed rule.

## E04 — Listing lead-time bounds and numeric syntax still differ

**New finding. Priority: medium. Cross-client editing mismatch.**

Web listing lead time has no HTML maximum and `listingPayload` uses `numberValue(..., true)`, which checks integer safety and the general `1e12` maximum rather than the native **36,500-day** maximum (`src/components/ListingForm.astro:149`, `src/lib/catalog.ts:62`, `:204`). The hosted column is a 32-bit integer and its CHECK requires only a nonnegative value.

**Reproduction:** actual web `listingPayload` accepts **36,501 days**. The actual Flutter edit field validator rejects the same value (`lib/presentation/screens/create_listing_screen.dart:539`). Consequently a web-created/backend-valid value can obstruct native editing. Web also accepts integer lead times beyond the column's range before the database rejects them; this was established from the field bounds and fresh column metadata rather than a live insert.

There is also a numeric-syntax difference: the native quantity validator accepts `1e2`, while web `numberField`/`numberValue` reject that string. Browser number controls can represent exponent input, so parser behavior should be deliberate rather than accidental.

**Required:** align listing lead-time bounds in controls and payload validators; preserve supported existing values when editing unrelated fields. Normalize or consistently reject exponent syntax without relaxing finite/range checks. Quote lead-time validators already share the 36,500-day cap; do not mistakenly treat the listing and quote parsers as the same code path.

## E05 — Quote-history limits affect completeness and the whole web detail page

**Expanded previously recorded large-history acceptance gap. Priority: high for affected records.**

Native `fetchQuotes` issues a single unpaginated request (`lib/data/repositories/enquiries_repository.dart:297`). It ignores whether the server result represents only a capped page and provides no incomplete-history state.

**Native reproduction:** an actual SDK/repository request received a representative capped response with 1,000 rows and `Content-Range: 0-999/1201`. It returned 1,000 quotes, made no second quote query and omitted the older rows. This is a mocked row-cap fixture; **this audit did not verify that the hosted project's configured cap is exactly 1,000**.

Web `quoteBundle` successfully fetched all **1,201** fixture rows in three 500-row pages. At exactly **5,000** rows it rejected with `comparison_too_large` after ten full pages (`src/lib/server/procurement.ts:346`). The prior report described this as a comparison limit, but normal enquiry detail also calls this helper before rendering (`src/pages/enquiries/[id]/index.astro:17`). The failure therefore blocks the detail screen and its attachments/actions, not only the comparison. Known individual quote routes can remain usable; they do not make the blocked detail page complete.

**Required:** paginate native quote history with stable ordering and an explicit completeness state. Separate bounded comparison/export from ordinary enquiry detail so a large history does not block the enquiry itself. Make version/export limits consistent and give useful navigation for older quotes. Cover row caps, 499/500 boundaries, 4,999/5,000, repeated timestamps and supplier/buyer scope.

**Backend implication:** no new query feature is identified for basic pagination. Confirm deployed Data API row limits and performance before choosing client page sizes. Preserve authorization on every page.

## E06 — Flutter presents loading failures as “No quotes”

**New finding. Priority: medium. Misleading error presentation.**

`EnquiryDetailScreen._loadRelated` loads quotes, attachments and a deal with `Future.wait`, then catches all errors by only clearing `_loading` (`lib/presentation/screens/enquiry_detail_screen.dart:75`, `:101`). Its default quote list stays empty; `_buyerQuoteSection` displays “No quotes received yet.” (`:505`). Failure of one related query can prevent successful results from the other queries being assigned too.

**Reproduction:** the actual detail widget received a failed quote load with otherwise successful empty attachments/deal results. It displayed “No quotes received yet.” and no Retry action, without surfacing a widget exception.

Web checks related query errors and aborts rather than rendering a successful empty result. That avoids this particular false-empty state but still needs live failure/recovery usability acceptance; this report does not claim all web error screens are polished.

**Required:** distinguish loading, loaded-empty and failed states; preserve successful sections when another fails if appropriate. Show a useful retry and avoid permitting decisions based on a falsely empty quote/deal state. Any new native retry tap must have haptic feedback per AGENTS.md. No backend schema change is identified.

## Evidence and current limits

- **Six new native diagnostics passed**, each asserting an actual defect/boundary behavior: repeated create after failed review, capped quote results, automatic replacement category, lead-time mismatch, numeric bounds, false-empty detail state.
- **Five web diagnostic groups passed** against actual helpers: listing lead-time acceptance, numeric precision/range acceptance, exponent rejection, complete paged retrieval and the 5,000-row bundle failure.
- Hosted arithmetic reads confirmed rounding/overflow; metadata reads confirmed relevant column types, CHECKs and business RPC contracts.
- The complete existing suites most recently passed **161 web / 143 Flutter tests** in the preceding audit on these same application commits. They were not rerun in this documentation-only pass. Passing reproductions establish the bugs; they do not count as fixes.
- Application code, schema and customer data remain unchanged. Only audit/checklist documentation was updated.

The preceding D01/D02/D03/D04/D06/D07 findings remain open. D05 is incorporated into E02; the large-record gate is now detailed by E05. These findings should be fixed alongside the existing checklist, not mistaken for duplicate completed work. Browser push, production operations and complete buyer/supplier/device/failure acceptance remain open. This focused second pass cannot guarantee the absence of other defects or certify equal security across all runtime paths.

Reference checklist: [remaining work](../remaining_work.md). Earlier current-code report: [first current recheck](flutter_web_parity_current_recheck_2026-10-06.md).
