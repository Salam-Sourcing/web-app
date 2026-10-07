# Current Flutter/web functional parity recheck — 2026-10-06

> **Implementation update:** The findings below describe the pre-fix audit baseline. Their D/E implementation issues are now addressed; see [the fix and verification report](parity_integrity_fixes_2026-10-06.md). Browser push and full release acceptance remain outstanding.

**Verdict: all native screens have web counterparts, but functionality is not yet fully 1:1.** This fresh audit found seven actionable differences or correctness issues, plus the already deferred browser push integration. Earlier W/C/R/S fixes remain present; their historical reports do not supersede the findings below.

**Subsequent independent pass:** [Second-pass findings](flutter_web_parity_second_pass_2026-10-06.md)
adds four confirmed issues and strengthens numeric/storage and quote-history findings.
Its E02 refines D05 below after inspecting the exact hosted numeric column types.

This was a read-only application/backend assessment. Only reference documentation was changed. No application code, schema, credentials, customer records, account settings or deployments were changed.

## Baseline and method

- Web: branch `1.0`, commit `9a3ed531da5ac666a60c34a3e5315e319258aead`.
- Flutter: branch `1.0`, commit `5a6332e80fe636d3e13c7e91b08322b0e62da2f4`.
- Re-inventoried all **37 Flutter screens and 21 repositories**, supporting widgets/services/state, web routes/actions, validation, payloads, pagination, media, exports, notifications and permission gates.
- Included dynamic RPC wrappers and conditional calls: **59 native RPC names, 60 web names, 57 shared**. Native-only listing submission has a web status-action equivalent; unavailable saved items use different retrieval helpers; public marketplace preview is an intentional web addition. Matching RPC names does not prove matching behavior.
- Inspected selected hosted function definitions, grants, attachment/Storage policies, upload-cleanup contracts, relevant CHECK constraints and push-function availability. These were metadata-only reads, not customer-row reads or live writes.
- Used a signed-in local browser to inspect Discover, Account, Enquiries, Sell and the inbox. Navigation did not submit forms, change records or open a message thread to mark it read.
- Ran both complete existing test suites and additional isolated diagnostics against actual application helpers/screens/repositories, with fixture data and mocked network responses.

Native paths below resolve under `../Salam-Sourcing-Marketplace-App`; web paths resolve in this repository. Source line references apply to the commits above.

## Findings, in fix order

### D01 — Web omits supplier enquiry attachment actions

**Priority: high. Actual capability missing on web.**

Flutter's enquiry detail permits upload for buyers and sales-authorized suppliers that are the direct supplier or have a quote (`lib/presentation/screens/enquiry_detail_screen.dart:453`). Uploaded files offer removal when `attachment.isMine` (`:653`).

Web renders upload/removal only for the buyer (`src/pages/enquiries/[id]/index.astro:226` and `:260`). Its upload target and removal handler also call the buyer gate (`src/lib/server/uploads.ts:110`, `:744`), so adding controls alone cannot fix it.

**Reproduction:** actual web upload preparation and removal helpers, given an authorized participating supplier and its own uploaded attachment, both reject with `wrong_company` before contacting Storage.

**Backend evidence:** current `private.can_access_enquiry_files` includes buyer procurement, direct/invited/quoted supplier sales access. Relevant Storage and attachment policies already support appropriately scoped supplier operations; insertion requires the current uploader and Storage paths remain user scoped. This does not mean every marketplace supplier may attach files to any RFQ.

**Required:** add the participating supplier controls and server authorization; preserve active-company, sales/procurement permissions, uploader ownership, enquiry-state rules and backend enforcement. Test buyer, direct/invited/quoted supplier, uninvolved supplier, revoked role and company switch. No schema migration is identified for the supported supplier capability.

### D06 — Flutter enquiry removal bypasses safe attachment cleanup

**Priority: high. Cross-client correctness/failure issue.**

`lib/data/repositories/enquiries_repository.dart:476` removes the Storage object first, then deletes `enquiry_attachments`. It does not use the existing cleanup claim or confirm metadata deletion. Web deletes and confirms metadata first, then calls `claim_upload_cleanup` before Storage removal (`src/lib/server/uploads.ts:744`).

**Reproduction:** an isolated test of the actual native repository records successful Storage DELETE followed by rejected metadata DELETE. The operation throws after the file has already been removed; its attachment record can remain. This is a mocked failure reproduction, not a change to a real attachment.

**Required:** confirm authorized metadata removal before cleanup, protect retained references using the current backend claim contract, and retain a retry path for cleanup failures. Keep both clients aligned for partial failure, lost responses and concurrent references. The hosted cleanup contract already exists; this audit identifies client integration work, not a new required schema migration.

### D02 — Web rejects larger submissions that its field validators allow

**Priority: high. Listings, RFQs, quotes and new companies affected.**

`src/pages/api/catalog/[action].ts:8` allows only **16,384 request bytes** except company updates. `src/pages/api/procurement/[action].ts:8` uses the same limit except message sending. These envelopes are smaller than valid encoded business payloads.

Actual validator/reader diagnostics confirmed all four examples below pass field validation and then fail the current request reader with HTTP 413:

| Valid fixture                                                                               | Encoded request size |
| ------------------------------------------------------------------------------------------- | -------------------: |
| Listing: 6,000 ASCII description characters and 30 specifications with 500-character values |         21,616 bytes |
| RFQ: 8,000 CJK requirement characters                                                       |         24,134 bytes |
| Quote: 5,000-character notes plus 1,000-character payment and shipping terms, CJK           |         21,159 bytes |
| Company creation: individually valid populated fields, CJK                                  |         17,233 bytes |

Flutter does not add this web proxy's 16 KiB envelope. The inspected business constraints do not impose an equivalent 16 KiB total. No real records were submitted to establish these reproductions.

**Required:** use bounded per-action envelopes large enough for the validated payload, UTF-8, JSON escaping and encoded specifications. Keep field limits and request abuse protection. Cover create/update/revise/direct/public paths as applicable. No business-schema migration is identified.

### D03 — Flutter editing can silently clear an RFQ category

**Priority: high. Existing-record preservation issue.**

The buyer dashboard opens enquiry detail with `categories: const []` (`lib/presentation/screens/buyer_dashboard_screen.dart:86`). Detail forwards that list to the edit screen. `CreateEnquiryScreen` restores category by name from the supplied list (`lib/presentation/screens/create_enquiry_screen.dart:62`) and saves `_category?.id` (`:132`). `EnquiryModel` stores a category name but no stable category ID. The repository includes the null `sub_category_id` key in draft updates (`lib/data/repositories/enquiries_repository.dart:232`). The hosted update function applies that null, clearing the stored category.

**Reproduction:** the actual native edit screen, with an existing categorized RFQ and the dashboard's empty category list, saves a draft whose category ID is null. The isolated widget test passed by asserting this defect.

**Required:** carry the stable stored ID, load categories for alternative entry points, and preserve the existing category unless deliberately changed. Resolve by ID rather than display name. Native saved-search detail also supplies an empty category list; cover any editable entry through it.

Web loads active category options and normally preserves an active selected ID. Its form has no fallback option for a stored inactive/unavailable category (`src/components/EnquiryForm.astro:67`); include a retired-category fixture for both clients in the fix. That web edge case was identified from source, not reproduced against a live retired-category record.

The stored ID and draft update contract already exist; no schema migration is identified.

### D04 — Native and web authentication input bounds differ

**Priority: medium; existing credential compatibility matters.**

Native signup requires nonempty first/last names and passwords of at least eight characters, without the web maximums (`lib/presentation/screens/auth_screen.dart:200`). Native password update also applies only a minimum (`lib/presentation/screens/reset_password_screen.dart:35`). Web caps signup names at 80 characters and login/signup/password-update passwords at 128 (`src/lib/server/auth-actions.ts:119`, `:129`, `:140`, `:188`).

**Reproduction:** the actual native Auth repository/SDK forwards a 129-character password for login/signup and an 81-character signup first name to a mocked Auth endpoint. Web rejects those values before calling Auth. The mock deliberately rejected registration; this is **not evidence that hosted Auth accepted a real account with those values**.

**Required:** align supported new-account/update bounds and verify hosted Auth's current constraints. Login must preserve supported existing credentials rather than arbitrarily truncating/rejecting them. Include both clients in the same boundary tests. No Auth configuration change is established by this audit.

### D05 — Fractional quantities need a shared client/storage contract

**Priority: medium. Sourcing information can be misleading.**

`lib/data/models/enquiry_model.dart:76` formats every noninteger with two decimal places. Actual in-memory model diagnostics show **0.001 units → “0 units”**, and **1.2345 units → “1.23 units”**. The displayed value is used in enquiry detail and its PDF inputs (`lib/presentation/screens/enquiry_detail_screen.dart:61`, `:430`). Web's `quantityLabel` preserves the supplied numeric value (`src/lib/procurement.ts:267`). Neither client requires RFQ input quantities to have only two decimal places.

**Correction from the independent second pass:** hosted RFQ quantity is `numeric(14,2)` with a positive-quantity CHECK. An input of `0.001` rounds to zero and would fail persistence; `1.2345` rounds to `1.23`. The diagnostic above does not establish an existing stored RFQ with sub-cent precision. This is therefore a shared validation/storage issue, not presentation work alone. Prices/MOQ have the same scale, and the clients' inclusive `1e12` maximum also exceeds these columns' range.

**Required:** align precision, bounds and display across clients and backend, with explicit rounding/rejection. If sub-cent quantities are required, plan a quantity precision migration. Full evidence and scope are in E02 of the [second-pass report](flutter_web_parity_second_pass_2026-10-06.md).

### D07 — Verification placement rule is still inconsistent

**Priority: medium. Confirmed visible web inconsistency.**

The local Sell page visibly renders a plain `verified` badge from `company.verification_status` (`src/pages/sell/index.astro:85`). This is outside a company profile and lacks the explanatory popover used by `VerifiedBadge`. It conflicts with the user's requested company-profile-only placement. Discover and the inspected inbox no longer display those company badges.

Native still renders supplier/buyer verification indicators in discovery cards, listing/enquiry detail, enquiry cards and its seller overview. These are source-confirmed presentation differences; they should not be copied back into web merely to match native.

**Required:** apply the requested placement consistently in the agreed client scope, use the explanatory interaction on profile verification marks, and retain authorization checks even when decorative badges are removed. Do not confuse company verification with “verified transaction” review evidence. Any new native tappable explanation must include haptic feedback per AGENTS.md. No backend change is required for placement.

## Deferred functionality and further acceptance work

**Browser background push remains the main deferred native capability.** Web's push scaffolding is disabled at the user's request. Public Firebase/VAPID configuration remains pending; fresh hosted metadata still has native `register_push_token` but not `register_web_push_token`. This integration requires the prepared backend rollout as well as web configuration and device/browser verification. In-app notification counts/preferences/freshness are separate and implemented.

Invitation email remains locked in both clients; it is not a working native feature omitted from web. Production diagnostic receipt/retention/alert routing, launch policy text and deployment checks remain release gates from the earlier reports.

**Large-record boundaries need explicit acceptance:** native enquiry quote retrieval remains unpaginated (`lib/data/repositories/enquiries_repository.dart:297`), relying on the Data API row cap. Web pages quote versions in batches of 500 but refuses a bundle once a full page brings it to at least 5,000 (`src/lib/server/procurement.ts:349`). Web comparison export refuses more than 500 quote rows; native PDF generation has a different page-based budget. These are source-confirmed differences in limits, not a reproduced claim that native can export every oversized collection successfully. Establish a shared completeness policy and test large version histories, older quotes and bounded export feedback.

## Screen coverage

“Counterpart” means the route/action was found and reviewed; it does not mean all role/device/error combinations have passed.

| Flutter screen               | Web counterpart or integration                             |
| ---------------------------- | ---------------------------------------------------------- |
| Accept company invitation    | `/invitations/[id]`, acceptance action                     |
| Account settings             | `/account`, `/account/billing`                             |
| Authentication               | `/login`, `/signup`, `/forgot-password`, Auth actions      |
| Buyer dashboard              | `/enquiries/dashboard`                                     |
| Company onboarding           | `/company/new`                                             |
| Company profile/verification | `/company`, `/company/edit`, verification uploads          |
| Company team                 | `/account/team`, member permissions and invitation actions |
| Create/edit enquiry          | `/enquiries/new`, `/enquiries/[id]/edit`                   |
| Create listing               | `/sell/new`                                                |
| Deal progress                | `/deals/[id]`, progress/completion/documents/reviews       |
| Direct enquiry               | `/enquiries/new` with supplier/listing context             |
| Discovery home               | `/discover`, public `/` preview/search login gate          |
| Enquiries                    | `/enquiries`, all/mine/saved views                         |
| Enquiry detail               | `/enquiries/[id]`, `/quotes/[id]`                          |
| Legal document               | `/terms`, `/privacy`, help/policy pages                    |
| Listing detail               | `/listings/[id]`                                           |
| Manage listing               | `/sell/[id]`, status/edit/image actions                    |
| Marketplace home shell       | `AppLayout`, navigation/account/company context            |
| Marketplace PDF              | Enquiry, quote and deal export/preview routes              |
| Message photo                | Embedded chat photo dialog with zoom/pan/retry             |
| Message thread               | `/messages/[id]`, captions/reporting/attachments/outbox    |
| Messages inbox               | `/messages`, active/archived/search/freshness              |
| Notification settings        | `/account/preferences`; browser push deferred              |
| Notifications                | `/account/notifications`, badge and destination resolver   |
| Privacy/safety               | `/account/safety`, blocks/reports/deletion                 |
| Profile information          | `/account/profile`                                         |
| Public company profile       | `/suppliers/[id]`, reviews/profile navigation              |
| Quote comparison             | `/enquiries/[id]/compare`                                  |
| Reset/update password        | Recovery callback and `/account/password`                  |
| Saved marketplace            | `/saved`, unavailable saved-item removal                   |
| Saved searches               | `/account/searches`, matches/configuration/removal         |
| Sell                         | `/sell`, filters/listing management/insights               |
| Submit/revise quote          | `/enquiries/[id]/quote`, quote action handlers             |
| Supabase bootstrap           | Middleware, session/access checks and callback flow        |
| Supplier insights            | `/account/insights`, date windows/view events              |
| Support requests             | `/account/support`, replies/appeals/personal export        |
| Two-factor authentication    | `/auth/mfa`, `/account/security`, factor controls          |

Detailed action review included listing images/specifications/statuses, discovery filters, RFQ fields/publication/invitations, quote terms/revision/decisions, deal documents/completion/disputes/reviews, company verification, team permissions/invitations, billing requests/invoices, saved-search alerts, support ownership/replies, account deletion, private media access and export bounds. Prior fixes for message reporting, attachment captions, photo viewer, profile navigation and stable timestamps remain in current code.

## Fresh verification and limits

- **161/161 existing web tests passed.**
- **143/143 existing Flutter tests passed.**
- Additional web diagnostics confirmed supplier attachment rejection, the four request-envelope failures and Auth input-bound mismatch.
- Additional native diagnostics confirmed Auth forwarding, RFQ category clearing, quantity rounding and unsafe attachment deletion order under mocked metadata failure.
- Passing diagnostic assertions reproduce defects; they do not mean those workflows are fixed. Existing suites currently miss these cases.
- Browser observations confirmed the Sell badge and exposed expected navigation/controls without customer mutations.

This is a broad source/contract audit with targeted runtime reproductions, **not proof that nothing else can fail**. Before claiming 1:1 release parity, complete signed-in buyer/supplier cross-client journeys, permission/session revocation, company switching, mobile/desktop layouts, private media expiry/retry and failure/concurrency tests. Use disposable approved fixture accounts/records for live acceptance. Do not weaken RLS, CAPTCHA, MFA, permission checks or request bounds to achieve superficial parity.

Fix checklist: [remaining work](../remaining_work.md). Historical corrections: [functional parity fixes](functional_parity_fixes_2026-10-06.md), [recheck fixes](parity_recheck_fixes_2026-10-06.md), [initial parity fixes](client_parity_fixes_2026-10-06.md).
