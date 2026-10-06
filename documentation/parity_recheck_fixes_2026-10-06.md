# Parity recheck corrections — 2026-10-06

**Latest code status:** the subsequent S01–S07 findings are now implemented and
locally verified; see [functional corrections](functional_parity_fixes_2026-10-06.md).
This report covers the earlier R findings. Live parity acceptance remains open.

The authorized follow-up corrects R01/R02/R03/R06/R07/R08 in the web and Flutter
working trees. R05 diagnostic code is implemented and verified locally; production
monitoring acceptance remains open. Browser push (R04) remains deferred and disabled.
These are local implementation results, not evidence of deployed or complete live parity.

## Changes

- Web support notices without entity fields now offer an Open action in SSR and
  automatic updates. The resolver reads the owned notice and validates `data.case_id`
  solely to select the fixed Support destination. It never redirects using JSON links.
  Company-verification notices resolve the authorized record and company, preserving
  fresh membership, recipient consistency and the existing company-manager gate.
- Web authenticator keys start concealed, with accessible Show/Hide, Copy and a
  selected-text fallback when clipboard access fails. Private-view discard, logout
  and navigation clear the key/QR; delayed copy completion cannot restore stale UI.
  Normal switching to the authenticator app conceals the key while setup continues.
- Web photo failures have an explicit Retry button, centered below the explanation.
  Retry reloads the same authenticated, uncached media route. Zoom and Download
  remain available; private-view cleanup removes the media and closes the dialog.
- Flutter opens conversation notifications by directly resolving the RLS-authorized
  conversation, including archived threads. It selects a currently authorized
  participating company when needed and preserves the current company if eligible.
- Flutter inbox search/pagination uses the existing deployed `search_conversations`
  RPC. Pages display 24 conversations, with an extra row to detect more results.
  Actual per-thread latest messages and exact unread counts replace the global
  1,000-message sample. Queries are bounded to one page; they still perform per-thread
  enrichment requests, so production latency is an acceptance check.
  An in-flight page is rejected before enrichment if its account or selected
  company changes; later enrichment responses also recheck that context.
- Flutter search stays mounted during loading; debounce/generation checks reject stale
  results. Load more retains existing pages. Realtime activity offers a Refresh action
  without resetting loaded pages or keyboard focus. New native actions have haptics.
- Flutter notification counts use an independent exact query across all owned unread
  notices. The newest-100 display limit no longer controls the badge or Mark all read.
- Web diagnostics retain only fixed error kinds and up to eight locations in known,
  loaded, same-origin compiled bundles. Raw messages/stacks, function names, tokens,
  account identifiers and private URLs are excluded. Authenticated same-origin receipt
  emits a stable group suitable for log aggregation; reporting remains bounded per page.

No additional backend schema or Auth changes were needed. Hosted helper metadata
was read only; no customer records, accounts or deliveries were changed. Existing
push and invitation-email rollout locks remain intact.

## Verification

- Web: 147 automated tests, including notification ownership/membership/role rejection,
  safe support destinations, diagnostic sanitization and actual endpoint receipt.
- Flutter: 130 tests and clean analysis. Ten focused regressions use the actual
  repositories/state with isolated HTTP data: 1,002 messages, older unread notices,
  later inbox pages, cross-company archived notification targets, stale search results
  an account change during fetching, and a 390×844 widget viewport with search focus preserved during loading.
- Browser: isolated synthetic data with actual web scripts and styles. Verified masked
  setup, reveal/hide, successful copying and manual fallback; private discard clears
  setup; photo request failure exposes Retry, retry decodes the image at the same URL,
  Retry disappears and Zoom reaches 150%. Temporary fixture route/server removed
  after verification. This was desktop browser control testing, not live mobile acceptance.
- Production web build passed; Astro check has zero errors/warnings and six existing
  hints in deferred push code. All 30 emitted JavaScript bundle filenames pass the
  diagnostic code-location validator. Release HTTP suite: 378 assertions passed,
  covering authentication/cache/redirect and API boundary behavior. Both repository
  diffs pass whitespace checks. No release, commit or push is included in this follow-up.

## R05 monitoring release gate

The endpoint logs one JSON record with `event=marketplace_client_error`, `schema=1`,
`group`, `category`, `kind` and `frames[{asset,line,column}]`. The local endpoint test
confirms receipt and that unauthorized, cross-origin, oversized and raw-field events
never enter this diagnostic log. Development module paths are intentionally omitted;
code locations identify immutable production bundles and their minified positions.

Before release, enable structured Workers log collection for the deployed worker,
retain the matching build assets privately for interpreting code positions, and route
alerts grouped by `group` to the team's chosen monitoring destination. Verify with an
authorized synthetic diagnostic in staging, observe its grouped log and alert receipt,
then record the selected retention window and destination here. Do not log private
source errors or send customer content as a test. Production log retention, alert
destination and delivery receipt have **not** been configured or confirmed by this work.

The full staging, role/permission, concurrency and physical-device acceptance matrix
in the original audit remains open. Deferred browser push and disabled invitation
email are tracked separately in [remaining work](../remaining_work.md).
