# Profile photos, loading states and enquiry recovery — 2026-10-06

## Enquiry detail failure

Hosted database logs identified `column saved_enquiries.id does not exist`.
`saved_enquiries` uses `(user_id, enquiry_id)` as its key. A successful creation
could therefore be followed by a failed detail-page read, which looked like an
account-access failure. The scoped saved-state helper now selects `enquiry_id`
and its explicit return type prevents silently reverting to the nonexistent
column. Existing enquiry 3 opened successfully in the signed-in local browser.

Middleware preserves the failed private destination. Page/data errors explain
that the page failed to load; Retry returns to that enquiry rather than Account.
The existing safe-destination validator and private access checks still apply.
Recovery also advises checking a submitted enquiry before posting it again.
HTTP regression checks cover the destination, wording and external-URL rejection.

## Personal profile photos on both clients

Web and Flutter have a dedicated profile identity/photo card, grouped contact
fields and collapsible account information. Photos appear on Account; web also
uses the avatar beside Notifications for its account dropdown. Upload accepts
JPEG, PNG and WebP up to 5 MB, including client byte-signature validation.
Flutter's new photo and account-information controls include haptic feedback.

The shared migration `20261007003604_personal_profile_photos.sql` is applied to
project `stjtdlwonexcgnhmgfqw`. Personal images use private `profile-photos`
Storage and owner-scoped `profile_photos` metadata. An active account can update
its photo without joining a company. Anonymous and unrelated accounts cannot
read or change personal photos, and clients cannot write metadata directly.

`set_profile_photo` checks the actor, image object, ownership and previous path
before replacement. Immutable upload paths, row/file locking and a previous-path
comparison prevent concurrent replacement from deleting a newer photo. Existing
upload budgets and persistent cleanup journals also cover this bucket. Cleanup
cannot remove referenced bytes, and claimed bytes cannot be attached again.
Web serves only the current user's `/api/media/profile/me` with private no-store
headers; Flutter uses an authorized short-lived private Storage URL.

Hosted readback confirmed the table/bucket/RPC permissions. Ten disposable
backend regression checks cover owner upload/attach, replay, competing updates,
cleanup, direct mutation, anonymous/other-user and suspended-account denial.
The backend advisor reports the intentionally guarded authenticated
security-definer RPC as a warning, consistent with existing RPCs; its authorization
is tested explicitly. See the [Supabase advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Web navigation and activity

Desktop Account moved out of the primary nav into a larger avatar beside
Notifications. Its menu links to Account, personal profile, saved items, company
workspace, security, support and Sign out. The mobile Account destination remains.
The signed-out Log in menu opens on mouse hover or click and offers login,
registration, platform information, plans and support. Click outside, Escape and
moving keyboard focus out close the menus. A hover bridge covers the gap to the
panel; hover no longer causes the first summary click to close it immediately.

Search, form submission and file uploads show compact spinners with busy states,
and navigation has a small progress indicator. Errors and retries remain visible.
Images in public/private listing cards, product galleries, avatars, message
attachments and upload previews show a spinner while loading. Only actual load
failures reveal fallback images. Each selected-file preview has its own frame,
so one loaded preview cannot hide another preview's loader. Flutter's shared
network-image wrapper and avatars similarly wait for the first decoded frame.

## Verification and remaining acceptance

The signed-in local browser was used to open the existing enquiry, follow its
Retry link, inspect the profile page and account dropdown. The signed-out browser
confirmed the public dropdown's first click opens and an outside click closes it.
Existing discovery images loaded without a temporary missing-image card.

Focused personal-upload and enquiry-schema unit tests pass. Flutter analysis is
clean and the full 191-test Flutter suite passes. The disposable SQL suite passes
439 checks including the ten new photo cases. The final paired verification
runs web checking/tests/build/production HTTP checks, Flutter analysis/tests and
the real PostgreSQL security/concurrency suite. Its exact paired revisions and
results are stored in `.parity-artifacts/automated.json` and the adjacent logs;
those results remain separate from physical-device acceptance.

No live personal photo, enquiry or message was created during verification.
A real upload/replacement on Android and iOS, then confirmation of that same
personal photo in web, remains a release acceptance task. This change does not
mark the broader eighteen-scenario release checklist complete.

## Direct login follow-up

Per the subsequent user request, signed-out Log in is now a direct button to
`/login`, without a dropdown. Signed-in account menus remain. Use the approved
local testing address `http://karamullahs-mac-mini.local:4321/` so the existing
Turnstile hostname approval applies. This supersedes the signed-out hover menu
and its acceptance description above.
