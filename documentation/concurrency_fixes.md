# Shared marketplace concurrency fixes

Completed on **2026-10-05** (migration recorded in UTC on 2026-10-06).
The user authorized changes to the shared backend and both clients.

## Applied backend migration

Project: `stjtdlwonexcgnhmgfqw`.
Migration: `20261006022503_marketplace_concurrency_guards.sql`, stored in
`Salam-Sourcing-Marketplace-App/supabase/migrations`. The filename was generated
with the Supabase CLI, then aligned with the confirmed hosted migration version.

The migration runs transactionally with bounded lock/statement timeouts. It checks
for existing duplicates and listings above five images while blocking conflicting
writes. Both counts were zero. It refuses inconsistent data rather than deleting
attachment metadata, images or Storage bytes.

- **Attachments:** a unique constraint on `message_attachments.file_url` makes
  each stored file reference unique across simultaneous requests. Text/attachment
  messages retain their existing unique sender/request-ID key.
- **Close/accept:** `accept_quote` locks the common enquiry before locking its
  quote, checks that it is open/quoted/negotiating after acquiring the lock,
  rereads the quote status, and checks validity against the current clock. A close
  that wins prevents acceptance; an acceptance that wins cannot be cancelled by
  `close_enquiry`. Competing quote acceptances serialize without each holding a
  different quote needed by the other.
- **Five images:** the existing private image trigger locks the parent listing and
  checks the count before every insert. It rejects the sixth image in the same
  transaction, including requests from different company members. Existing edit,
  deletion, moderation invalidation, ownership and upload-reference guards remain.

Authorization, MFA/session checks, RLS, quota checks and the existing guarded RPC
signature remain in place. Anonymous callers cannot execute acceptance, and
customers cannot call the private image trigger function directly.

PostgreSQL's [row-lock behavior](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
and consistent lock order are the basis for the transaction guards.

## Web and Flutter compatibility

Both clients use the shared backend, so its rules protect existing versions too.
Updated source improves retry behavior; it needs the next website deployment and
Flutter build to reach users.

- Web attachment metadata uses ignore-duplicate upsert on `file_url`, then verifies
  the stored message/file metadata before acknowledging success. It retains the
  same upload/message request key and immutable Storage object.
- Flutter now retains the picked file, original caption and request ID for an
  explicit Retry. The retry reuses its Storage path, verifies existing bytes if
  upload returns Duplicate, confirms the message by its request ID, and uses the
  same ignore-duplicate metadata insert plus confirmation.
- Flutter preserves any newer composer draft while confirming an older attachment.
  Its Retry action includes haptic feedback. The recovery journal reuses the
  original same-path intent and clears matching entries after confirmation.
- Both existing acceptance flows call `accept_quote` and display its failure
  instead of reporting success. Both seller flows receive the authoritative image
  cap failure; unattached uploads remain subject to reference-aware cleanup.

No client uses overwrite/upsert for Storage bytes or updates another attachment's
metadata to resolve a conflict. The key identifies one send attempt, not all files
with identical contents: deliberately sending the same file again is allowed.
Pending Flutter file/caption state remains in memory; this is not a durable outbox.

## Verification

- **372 backend checks passed** on a disposable native PostgreSQL 17 server,
  using separate connections. The five concurrency checks explicitly observed
  blocked transactions before allowing the winning transaction to commit:
  close first; accept first; different quotes accepted simultaneously; duplicate
  file metadata upserts; different company members competing for the fifth image.
- **367 backend fixture checks passed** with PGlite, including authorization,
  unrelated-user denial, immutable metadata, closed/cancelled/accepted enquiries,
  direct sixth-image insertion, edit/delete behavior and RPC/trigger grants.
- **7 backend notification/email unit tests passed.**
- **95 Flutter tests passed**, including lost message and metadata acknowledgements,
  matching request IDs/paths, byte/caption mismatch rejection and journal reuse.
- Changed Flutter source/tests: analyzer reports **no issues**.
- Web: **75 tests passed**, type check reports **0 errors/0 warnings** with one
  pre-existing callback hint, Cloudflare build succeeds, and **212 production
  HTTP assertions passed**.
- Hosted verification confirms the unique constraint, enabled image trigger,
  acceptance status guard and preserved access grants; duplicate paths and
  over-limit listings remain zero. Security advisors match the pre-change baseline.

The migration was applied successfully and recorded once. No customer accounts,
messages, quotes, deals, image rows or stored files were created/deleted by the
deployment or hosted checks. Concurrent behavior was exercised in isolated local
databases, not against real customer transactions.

## Repeating backend tests

From the Flutter repository's `supabase/tests` directory:

1. `npm ci` and `npm test` run the PGlite suite plus notification/email unit tests.
2. Create a fresh disposable native Postgres database on loopback named
   `salam_concurrency_test`, with a test superuser able to create fixture roles.
3. Set `CONCURRENCY_DATABASE_URL` to that local database and run `npm test`.
   The runner rejects non-loopback hosts and names outside `salam_concurrency_*`.
   Never point this fixture runner at a shared application database.

The native adapter uses the pinned `pg` development dependency. The validation
run used an isolated temporary embedded Postgres installation; it is not an app
runtime dependency.

## Remaining release checks

Deploy updated web source and build/release Flutter to deliver the retry UX.
Then exercise the signed-in web ↔ Flutter sourcing journey and deployed Realtime/
file delivery. Those broader Phase 3 acceptance gates remain open. These three
database concurrency findings are resolved; large search datasets, PDF glyph
coverage and later feature phases remain tracked separately.
