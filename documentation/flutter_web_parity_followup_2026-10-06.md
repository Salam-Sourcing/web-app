# Flutter/web parity follow-up — 2026-10-06

**S01–S07 are now corrected in both working trees and locally verified.** See
[functional parity corrections](functional_parity_fixes_2026-10-06.md) for current
implementation, limits and verification. Browser push remains deferred and live
cross-client/device acceptance remains open. The findings below retain the
original read-only audit's pre-fix observations and source locations.

Application code and hosted business data were not changed by this audit. Only
audit documentation was updated. Unrelated native Android UI testing work and
existing uncommitted implementation changes were preserved.

## Scope and evidence

- Rechecked the current working trees against the 37-screen/21-repository
  inventory, supporting widgets/state/services, web routes, SSR and dynamic
  rendering, mutation handlers, field choices, media and export boundaries.
  Screen presence was checked separately from reachable controls and payloads.
- Refreshed calls including dynamic procurement wrappers and block/unblock:
  **59 native RPC names, 60 web RPC names, 57 shared**. Disabled scaffolding is
  counted as source, not a working integration. Native-only listing submission
  has a web equivalent through `set_listing_status`; it is not a missing feature.
- Inspected selected hosted definitions, grants, constraints and triggers in
  `stjtdlwonexcgnhmgfqw`, including company updates, reports, messages and the
  deployed query helpers. No customer-row sampling or live mutations were needed.
- Ran **14 isolated checks** against actual web helpers and selected source:
  company validation, name/message limits, export page/byte caps and the missing
  chat/review affordances below. The checks deliberately assert present gaps;
  their passing result confirms those observations, not successful parity.
- Reran **19 existing web tests** across client parity, notification destinations
  and the diagnostic endpoint: all passed. The earlier 147 web tests, 130 Flutter
  tests, analyzer/build and 378 HTTP assertions are previous corrective-turn
  evidence, not fresh execution in this read-only audit.

Temporary evidence: `/private/tmp/salam-third-parity-diagnostic.log`,
`/private/tmp/salam-third-parity-regression.log`, and
`/private/tmp/salam-third-parity-rpc-inventory.json`. These are local diagnostic
artifacts, not committed release evidence or durable automated coverage.

Paths starting `lib/` refer to the sibling
`Salam-Sourcing-Marketplace-App` repository; `src/` refers to this repository.
Locations describe the current working trees and may move after implementation.

## Original confirmed findings — subsequently corrected

### S01 — Web chat has no incoming-message Report action

Flutter's `lib/presentation/screens/message_thread_screen.dart:380` opens the
report dialog; incoming bubbles receive the callback at line 538 and expose
**Report message** at line 749. The safety repository submits the existing
`file_complaint` contract.

Neither `src/pages/messages/[id].astro` nor the live/older-message renderer in
`src/scripts/messages.ts` exposes that action. `/account/report` and the safety
handler support message targets, but manually constructing a URL with a message
database ID is not a usable substitute for reporting the message being viewed.

**Required:** add reporting to authorized incoming messages in SSR and dynamic
history, retaining current account/company/target checks. Existing backend
reporting supports this; no schema/RPC change was identified.

### S02 — Web cannot send a caption with an attachment

Flutter captures the composer at
`lib/presentation/screens/message_thread_screen.dart:307`, sends it as `caption`
at line 322, and retains the file/caption on retry. The repository writes caption
text to the attachment message and checks it when recovering an existing retry
key (`lib/data/repositories/messages_repository.dart:397`, line 452).

The web file form has no caption field or composer association, and
`src/scripts/procurement.ts:10` has no caption argument. The message upload branch
in `src/lib/server/uploads.ts:455` explicitly passes an **empty string** to
`sendText`. Web can display a caption sent by Flutter, but cannot create that
same message. Sending a separate text message is a different workflow.

**Required:** carry a caption through preparation/upload/recovery, bind it to the
same retry intent, and retain the draft on failure. Existing message content
supports captions; preserve the previous attachment/concurrency protections.
No backend schema change was identified.

### S03 — Web chat has no direct counterparty company-profile action

Flutter has **View company profile** in the thread app bar at
`lib/presentation/screens/message_thread_screen.dart:433`; the profile also gives
access to company report/block actions. The web already resolves the other
company (`src/pages/messages/[id].astro:18`) but displays its name as a title and
provides only **All messages** as a header action. Neither thread renderer links
to `/suppliers/[id]`.

**Required:** expose the authorized counterparty profile with an unavailable
fallback. Do not add a verification badge to chat; the user's web placement rule
still applies. Company blocking is reached through the native profile, not a
separate native thread button. No backend change was identified.

The original screen matrix incorrectly said profile/report/block were present
in web chat. That row is corrected and points here.

### S04 — Profile, company and message validation still differs

These are cross-client continuation issues, not missing screens:

| Field/action | Flutter behavior | Web behavior and consequence |
| --- | --- | --- |
| Existing company business email | Optional in the profile editor; update RPC permits null | Required valid email; an existing blank value prevents saving unrelated edits |
| Existing company description | Editor has no per-field maximum; selected hosted update contract has no 4,000-character cap | Maximum 4,000; a 4,001-character native value cannot be resaved unchanged |
| First/last name | Nonempty required, no editor/repository character maximum | Maximum 80 each; an 81-character value fails validation |
| Chat text | Nonempty required, no composer character maximum; hosted content constraint is 65,536 bytes | Maximum 8,000 characters; 8,001 ASCII characters fail web validation despite fitting the hosted byte bound |

Evidence: `lib/presentation/screens/company_profile_screen.dart:302` and `_field`
at line 370; `lib/data/repositories/company_profile_repository.dart:95`;
`lib/presentation/screens/profile_information_screen.dart:61` and fields at
line 304; `lib/data/repositories/profile_repository.dart:46`;
`lib/presentation/screens/message_thread_screen.dart:226` and composer at line 820;
`src/lib/catalog.ts:100`; `src/lib/server/account-actions.ts:28`;
`src/lib/server/procurement-actions.ts:277`.

Hosted company/profile columns are text. Company update requires nonempty legal
name, display name and country, but does not impose these web per-field caps.
The general write-budget trigger is not equivalent to them. The message size
check is marked `NOT VALID`; that does not exempt new writes from the check.
The examples above fit the inspected size boundaries. Web rejection is reproduced
locally; this audit did not submit synthetic native writes or count affected
customer records. Other authorization/state constraints still apply.

**Required:** choose consistent new-write validation and allow safe editing of
existing values without silent truncation or unrelated required-field failures.
Align both clients. Backend canonical validation may be a separate design choice;
these mismatches do not themselves require a new backend feature.

### S05 — Web inline review reporting omits a reason and early validation

Flutter reviews use `lib/presentation/widgets/report_content_dialog.dart:52`,
which includes **Impersonation**, and checks a five-character explanation at
line 97. Web's `src/components/CompanyReviewCard.astro:70` offers five reasons,
omitting impersonation, and only marks the explanation required. Its handler
(`src/lib/server/deal-actions.ts:20`) permits a one-character explanation before
the hosted function rejects it. Native permits up to 1,000 characters; this web
form permits 2,000.

The generic web report page offers the full reason set, but the inline review
workflow does not link to that alternative. Hosted `report_company_review`
delegates to `file_complaint`, which accepts impersonation and requires at least
five explanation characters.

**Required:** reconcile inline choices and description validation with the shared
report flow in both clients. No backend change was identified.

### S06 — Web listing uploads lack native image preprocessing

Flutter requests `maxWidth: 1800` and `imageQuality: 84` from ImagePicker before
validating selected listing images
(`lib/presentation/screens/create_listing_screen.dart:127`). Web validates and
uploads the original browser `File` (`src/scripts/catalog-forms.ts:14`, line 58),
with no equivalent resizing/compression step.

This can make a large phone photo usable in Flutter but require manual resizing
on web. Actual reduction depends on the image and native picker/platform; it is
not guaranteed. The clients also disagree at the exact 5 MiB boundary: native
rejects `>`, web rejects `>=`.

**Required:** reconcile preprocessing/byte-boundary behavior, preserve orientation
and supported formats, and test real phone photos against the existing storage
limit. No backend feature change was identified.

### S07 — Personal export capacity differs

Native `lib/data/repositories/support_requests_repository.dart:110` can request
pages 0–10,000 and has no explicit aggregate byte cap. Web
`src/lib/account.ts:97` defaults to 100 page requests and 10 MiB. Both use
`panel_customer_export` and the same 13 sections.

The web deliberately returns **413 with complete-export support guidance** when
its limit is exceeded; it does not silently deliver a truncated export. The
isolated checks reproduced rejection of a synthetic export needing more than
100 requests and one exceeding 10 MiB. Native's larger allowance is source
evidence, not a guarantee that a device can hold arbitrarily large exports.

**Required:** explicitly decide the supported capacity/workflow across clients.
Do not remove web resource bounds without a bounded delivery alternative. An
alternative export architecture may need backend work; the existing difference
alone does not establish that a migration is necessary.

## Deferred integrations and release acceptance

- **Browser push:** deliberately deferred by the user. Native registration,
  background notification delivery and notification taps have no enabled web
  equivalent. Web scaffolding remains locked; hosted `register_web_push_token`
  is absent. Completing this later needs Firebase public config/VAPID and the
  prepared backend rollout, not simply a UI change.
- **Diagnostics operations:** richer bounded web reporting is implemented and
  locally tested; production receipt, retention and alert delivery remain open.
  Native Crashlytics also was not verified against production receipts here.
- **Invitation email:** deliberately rollout-disabled; this is not a working
  native feature silently omitted from web. Keep the lock in both clients.
- **Live acceptance:** the existing role/company/Auth/RLS, blocked or revoked
  access, upload/retry/concurrency, billing/deal and device/layout matrix remains
  open. Source/contract inspection and local tests do not prove every combination.

The recent notification navigation/counting, inbox, MFA-key and chat-photo
corrections remain present; their implementation evidence is in
[Recheck corrections](parity_recheck_fixes_2026-10-06.md). Both clients intentionally
adapt navigation, secure credential storage and sharing to their platforms.
Public browsing, `/platform`, verification explanations and the three placeholder
public plans are intentional web additions, not native parity defects.

## Recommended correction order

1. S01/S02/S03: close chat action and payload gaps, including old/live messages,
   archived threads, unavailable counterparties and caption retry recovery.
2. S04/S05: align input contracts in both clients while preserving existing data;
   cover boundary cases and unchanged-value edits explicitly.
3. S06/S07: reconcile photo preparation and export capacity, then execute the
   existing cross-client/device/role acceptance matrix. Native additions must
   retain haptic feedback. Keep browser push deferred unless the user resumes it.

The current checklist is [remaining work](../remaining_work.md). These seven
findings are not an assurance that no further runtime defects can exist.
