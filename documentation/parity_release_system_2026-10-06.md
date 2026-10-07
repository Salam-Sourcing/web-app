# Shared parity verification and F01–F06 corrections

Implemented 2026-10-06 in both current working trees. Earlier D/E corrections and
all pre-existing changes were preserved. Nothing was committed, pushed or
published in this task. No customer records were inspected or changed, and no new
hosted migration was applied. Hosted reads refreshed the selected RPC signatures;
the F corrections use existing backend contracts and permission enforcement.

## Corrections

| Finding                        | Change                                                                                                                                                                                                                                                                        | Regression evidence                                                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 web quote notification     | Read the RLS-visible quote, then its actual parent enquiry; require a participating recipient company and effective buyer/supplier scope before selection/navigation.                                                                                                         | Distinct IDs, both parties, cross-company selection, missing records, unrelated company and revoked scope.                                                                                                                                                 |
| F02 native listing retry       | Retain draft ID immediately in an attempt; keep immutable fields/files, stable upload paths and completed-image progress; reconcile metadata/review after lost responses. Unknown initial create stops and links to Sell. Retry buttons retain the original requested action. | Review rejection creates one draft; lost image metadata acknowledgement attaches/uploads once; lost review acknowledgement does not resubmit; the original unknown attempt stays frozen after Sell reconciliation, while a deliberate new form is allowed. |
| F03 native verification detach | Confirm metadata DELETE before claimed cleanup; use the persistent cleanup journal for owned objects; no bytes removed on denied/zero-row removal.                                                                                                                            | Rejected/zero-row DELETE and successful metadata → claim → Storage ordering; existing journal recovery/account-change tests.                                                                                                                               |
| F04 native completeness        | Use exact counts and actual returned row counts for saved IDs and legacy supplier retrieval; supplier profile renders a counted page with haptic Show more/Retry, preserving existing content while loading.                                                                  | 1,201 saved/catalogue rows under a 75-row response cap, and bounded 24-row supplier pages.                                                                                                                                                                 |
| F05 native safety failure      | Fetch blocked companies and deletion independently; expose haptic section retries; retain loaded cancellation and never show scheduling from unknown deletion state.                                                                                                          | Either query failure, both failing, successful pending request retained; native widget rendering exercises actual screen.                                                                                                                                  |
| F06 native company creation    | Validate before insert; distinguish explicit SQL rejection from uncertain/malformed write acknowledgement; stop repeated create and offer Check your companies.                                                                                                               | Lost/malformed response inserts once; explicit rejection permits correction; intentional later creation still works.                                                                                                                                       |

A manager can remove an authorized verification reference uploaded by someone
else, but cannot claim that uploader's Storage bytes. They are left for authorized
cleanup rather than bypassing object ownership. Failed owned cleanup remains in
the existing secure journal. Listing attempt state persists during the open form;
a process restart requires checking Sell and reopening the saved draft. Unknown
initial company/listing creation uses stop-and-check; this is not a claim of
backend exactly-once creation for direct inserts. Request-ID RPC protection for
RFQs/quotes from the earlier task remains unchanged.

## Repeatable system

See [the shared contract](../parity/contract.json) and
[runbook](../parity/README.md). There is now a fixed inventory and 18 acceptance
scenarios, common field/numeric fixtures exercised by **both** clients, a paired
verification runner, and a revision-bound release gate that refuses missing,
skipped, failed, stale or unverified acceptance evidence. New screens/pages fail
inventory tests until their contract is updated. Shared contracts must match.

Normal CI includes the contract tests and browser layout/gating projects. Native
and paired CI run real PostgreSQL concurrency. The paired workflow is authored
for web enquiry → native quote/chat/photo → web notification/viewer/attachment/
acceptance/PDF → native persisted reload/photo viewer. It uses generated local
accounts, distinct quote/enquiry IDs and private media on a disposable Supabase
stack. It does not replace the full checklist or physical device acceptance.

## Verification and honest limits

- Web: **194 unit/contract tests**, type check and release build passed.
- Flutter: **187 unit/widget/contract tests**, with analysis of app/tests/integration
  sources passing.
- Disposable real PostgreSQL: **425 security regression checks**, including actual
  simultaneous request replay and the prior integrity guards, passed.
- Production web HTTP: **378 assertions** passed with no live business actions.
- Isolated UI-backend schema/fixture tests: **2 tests** passed.
- Browser test discovery succeeds (12 project/test combinations before optional
  stage selection); this is not browser execution evidence.

The new paired browser/Android journey has **not executed locally**: Docker is not
available for the existing disposable Supabase stack. The in-app browser's local
navigation returns connection refused despite the host server listening. Full
physical iOS/Android/browser acceptance, production CAPTCHA/email/MFA/device push,
all roles, legal/subscription content approval and remaining checklist cases stay
unverified. The manual paired workflow needs a read-only companion-repository
checkout token and must run after the changes reach the selected refs. Required
GitHub protection settings were not changed.

Browser push remains explicitly deferred by the user. Dependency audit reports
five pre-existing high findings in the Cloudflare/sharp development dependency
chain; the Playwright addition did not change that chain. No automatic incompatible
downgrade was applied. Assess that existing dependency risk before launch.

The gate remains blocked until real acceptance evidence for the exact paired
source is supplied. These results establish the listed corrections and local
regression baseline; they do **not** declare complete live 1:1 parity.
