# Notifications, Sell and security UI — 2026-10-06

## Notifications on both clients

The inbox uses compact activity cards with a type icon, unread indicator, sender
company, original message/resource preview, context and timestamp. Photo messages
show Photo and any caption. Read/delete actions sit in a small options menu;
refresh, mark all read and preferences share a compact toolbar. Failed actions
preserve the item and expose retry. New Flutter tap controls include haptics.

Existing notification rows intentionally retain generic titles and bodies and
minimal metadata. The shared migration
`20261007010811_notification_activity_feed.sql` is applied to Supabase project
`stjtdlwonexcgnhmgfqw`. Its `get_notification_feed` RPC is SECURITY INVOKER,
owner-scoped and capped at 100. The exact immutable message deduplication key
identifies the original message; current RLS controls messages, attachments and
related enquiries/quotes/listings. Sender identity uses the existing authorized
public company projection. No private preview is stored in notifications or
added to OS push payloads. Deleted messages and revoked access lose their previews.
Anonymous execution is denied; hosted readback confirmed permissions. The hosted
advisor reports no finding for this new invoker function; existing advisor
warnings are outside this UI update.

Web server rendering and polling share this feed, while the full unread count
continues to include older updates. Polling removes revoked rows and unavailable
previews promptly. It does not interrupt someone reading with new cards; a small
Show latest updates button applies them. Flutter preserves existing lifecycle,
realtime and private deep-link authorization.

## Sell on both clients

A compact company identity card replaces the oversized seller workspace. Company
profile and supplier insights remain accessible, and status chips have readable
labels and counts. Each workspace has one floating Post an item button, shown
only with listing permission and a successfully loaded company. Bottom content
padding and floating offsets prevent overlap with navigation and safe areas.
Listing management and publication permissions remain enforced by the backend.

## Web Security & password

Account has one highlighted shield tile for Security & password. The destination
combines password change and existing authenticator enrollment/verification/removal.
The legacy security URL redirects to the two-factor section. Each password field
has its existing Show/Hide control. Email verification appears when explicitly
requested or when Supabase requires reauthentication. Hidden verification inputs
remain disabled. QR/manual-key concealment, clipboard handling, secret cleanup
and the protected MFA challenge flow are retained.

## Verification and remaining acceptance

Focused tests cover notification sender/preview presentation, shared feed parsing,
exact message identity, deleted/revoked/anonymous access, retained failed actions,
and narrow Flutter layouts. Flutter notification and seller widget checks run at
320 pixels wide without overflow; Sell has one floating post action. Signed-in
local browser inspection confirmed actual sender/message/photo previews, the
seller button, the combined password/2FA page and its optional code controls.
No live notification was marked/deleted, message posted or authenticator enrolled
during these browser checks.

The final seven-check paired run writes exact revision results to
`.parity-artifacts/automated.json` and its adjacent logs: web types/tests/build/
production HTTP, Flutter analysis/tests and disposable real PostgreSQL security
and concurrency checks. The shared parity contract now includes these outcomes.

Use `http://karamullahs-mac-mini.local:4321/` for local testing. Distribute a new
Flutter build and verify notification opening, haptics, floating buttons, keyboard
and safe areas on Android/iOS. These changes do not complete the broader physical
release acceptance checklist. Browser push remains explicitly deferred.
