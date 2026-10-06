# Web and Flutter parity corrections — 2026-10-06

**Latest code status:** S01–S07 are also implemented and locally verified. See
[functional corrections](functional_parity_fixes_2026-10-06.md) and the remaining-work
checklist for shared limits, current evidence and open live acceptance. This
report preserves the earlier W/C correction history.

The confirmed non-deferred gaps from the [source/contract audit](flutter_web_parity_audit_2026-10-06.md)
are implemented in both repositories. The shared query migration is applied to
project `stjtdlwonexcgnhmgfqw`. This records implementation and local verification;
full authenticated staging and physical-device acceptance is still open.

## Web corrections

- **W01:** Authenticator QR rendering accepts the installed SDK's SVG data URL,
  raw/encoded SVG and UTF-8 base64 SVG. It never encodes the whole data URL as SVG;
  parsing/image failures retain manual setup and show useful feedback.
- **W02:** Every private workspace page has an unread notification bell. Authorized
  reads run on load, every 30 seconds while visible/online, and on focus/reconnection.
  Counts update without blocking the page. The notification center offers new rows
  through **Show latest updates**, preserving reading position and focused actions;
  deleted/revoked rows are removed promptly. Abort, logout, hidden workspace and
  fingerprint checks prevent stale responses from restoring private content.
- **W03/W04:** RFQ search includes title, requirements, buyer and structured location.
  Conversation search includes counterpart company, enquiry and the latest visible
  preview. Filtering happens in the database before stable pagination, avoiding
  first-page-only filtering and capped intermediate ID lists. Search text is literal.
- **W05:** Saved items have a paginated **Unavailable** tab. The database returns only
  the signed-in user's saved listing IDs; the web can remove a save without revealing
  the hidden listing's title, description, supplier or image. An item absent from the
  current catalog page is not automatically treated as unavailable.
- **W06/W07:** Chat photos support zoom buttons, wheel, double-click, drag, pinch,
  keyboard zoom/reset and gallery navigation. Changing/closing a photo resets its
  transform. Missing MIME metadata falls back only to JPEG/PNG/WebP filename hints;
  explicit conflicting MIME stays excluded. The authorized media endpoint still
  checks account/company/party access and downloaded Storage content type.
- **W08–W11:** Quote lead time is optional, with a 30-day validity default. Profile
  account metadata is visible. Password fields have accessible visibility controls
  without changing their value or autofill. Invitation links/codes can be copied,
  with a select-and-copy fallback when Clipboard access is unavailable.
- **Operational:** Browser error reporting sends only `uncaught_error` or
  `unhandled_rejection` to a same-origin authenticated endpoint. Private messages,
  stacks, URLs, tokens, account identifiers and filenames are not sent. This provides
  categorical Cloudflare runtime log signals, with a client submission bound;
  production log retention, alert routing and receipt acceptance remain launch work.

## Flutter and shared continuation corrections

- **C01:** RFQ models/editors preserve independent country, currency, visibility,
  city and province/state fields. Authorized draft/rejected currency changes agree
  with the actual hosted `update_enquiry_draft` contract. Existing deadlines retain
  their instant and display locally; expired dates require an explicit correction
  rather than silently extending the request. Date and time are both editable.
- **C02/C03:** Listing editors accept custom units and arbitrary valid lead days,
  display stored currency, allow optional origin, and support web-compatible name
  and description bounds. Empty optional specifications no longer come prefilled
  with a name that makes the form invalid. Native specifications support up to 30
  pairs with compatible name/value bounds and duplicate-name feedback. Direct
  enquiries also support compatible subject/message bounds and an editable currency
  initialized from the listing. Numeric entry rejects non-finite/out-of-range values.
- **W08/C03:** Native quotes initialize from RFQ currency, expose separate payment
  and shipping terms and explicit validity date/time, and retain optional lead days.
  Narrow-screen date controls and RFQ actions wrap/stack without overflowing.
- **C04:** Native PDF creation catches synchronous/asynchronous failures and retry
  keeps `setState` synchronous. Failed generation can retry into a usable preview.
- **C05:** Both clients' All RFQ feed contains published active RFQs visible to the caller,
  including authorized invited RFQs. Mine
  includes the selected company's owned/direct/invited/quoted records; Saved remains
  personal. Native retrieval uses paginated authorized tab queries and batches company
  summaries. Both inboxes use the selected company. Native thread counterpart and
  sender attribution also use that company, including membership in both parties;
  unrelated selections fail before sending/uploading and retry cannot change attribution.
- Added/changed native tap controls retain haptic feedback.

## Backend and rollout

Migration in the Flutter/shared backend repository:
`supabase/migrations/20261006175843_client_parity_search.sql`.

It adds `search_enquiries`, `search_conversations` and
`get_unavailable_saved_listings`. All three are **SECURITY INVOKER**, use an empty
search path, validate bounded inputs/pages and grant execution to authenticated
callers only. Existing table RLS, private Storage policies, session/MFA guards and
write permissions remain authoritative. No privileged browser client is added.
Hosted metadata confirms invoker execution, authenticated grants and denied
anonymous grants; the schema reload notification was issued. Post-change advisors
reported no notice referencing these three helpers; existing unrelated advisories
remain, including prior privileged-function and index/policy notices.

Deploy the query migration before the updated clients. It is already applied to
this configured project; its local filename matches hosted migration history.
A separate target environment needs its own migration. Apply this specific query
migration; do not roll out the earlier deferred web-push migration as part of it.
The web build and a new Flutter release are still needed for hosted/installed users
to receive these client changes. Old clients retain their existing contracts.

**Browser push stays deferred**, disabled and unapplied. The prepared earlier web
push migration and sender payload were not rolled out. **Invitation email stays
locked off**; this follow-up does not activate it or change sender configuration.

## Verification evidence

- Web: **137 behavioral tests**, Astro check with **zero errors/warnings** and six
  existing hints, successful production build and **378 production HTTP assertions**.
  HTTP checks include the new notification and diagnostics endpoint access/privacy guards.
- Flutter: **120 tests** and clean analysis. Permanent regressions exercise listing
  custom units/10-day leads, nine specifications, structured invited USD RFQ edits,
  direct-enquiry currency, quote terms/nullable lead, PDF retry and selected-company
  attachment behavior. RFQ/quote widgets pass at **320/390/768 pixels** with the
  actual app theme; direct enquiry passes at 320 pixels.
- Shared backend: **406 isolated database/security assertions** plus **nine push/email
  handler tests**. Added cases cover search-field matches, hidden rows, stable pages,
  selected-company rejection, anonymous execution, own unavailable-save removal,
  suspended callers and draft currency/location/audience preservation.
- Browser interaction fixtures passed for password visibility, invitation copying,
  unread updates, photo opening/zoom/gallery reset and clearing an open viewer when
  the workspace locks. Fixtures used synthetic data, did not bypass production
  authentication, and were removed before the production build.

No real customer records, Auth factors, invitation deliveries or message recipients
were mutated for these checks. Hosted changes consist only of the additive query
migration. Unrelated pre-existing Android UI testing work was left untouched.

## Remaining acceptance

The audit's **C — cross-client live acceptance** matrix remains open: controlled
buyer/supplier staging journeys, actual MFA enrollment/manual verification, revoked
roles/permissions during interactions, real mobile browser/touch/layout checks,
physical-device PDF sharing and release builds, and final production monitoring.
The browser fixture viewport facility did not reliably change its actual viewport;
its desktop interaction evidence is not presented as mobile browser acceptance.
Passing local checks is not a claim of zero defects or completed release readiness.
