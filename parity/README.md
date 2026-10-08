# Salam client parity and release acceptance

The shared contract is `parity/contract.json` in **both** repositories. Keep the
files byte-identical. It records the 38 native screens, all web pages, shared field
limits/numeric fixtures, and 18 acceptance scenarios. A new page or screen must
update this inventory and its acceptance scenario. Inventory proves coverage of
surface area; it does not prove an action works.

`parity/plans.json` is the shared, read-only Starter/Growth/Business catalogue.
Keep it byte-identical across clients; verification also checks these files.
The commercial proposal and activation boundary are in
[`documentation/plans.md`](../documentation/plans.md). Display keys in this
catalogue are not database subscription IDs or current entitlements.

## What matches

Both clients must support the same business actions, values, ownership and
permission rules, and the same persisted result after retries/failures. Layout,
navigation, public website browse, native haptics and device integrations can
use appropriate platform behavior. Add haptics to every new Flutter tap control.
Browser push is the only explicitly deferred capability in this contract, as
requested by the user. It is not counted as implemented delivery.

## Local verification

From the **web** repository, with Node/Flutter and the Flutter repository's locked
`supabase/tests` dependencies installed:

```sh
npm run verify:parity -- --native /path/to/Salam-Sourcing-Marketplace-App
npm run gate:parity -- --native /path/to/Salam-Sourcing-Marketplace-App --template
npm run gate:parity -- --native /path/to/Salam-Sourcing-Marketplace-App
```

`verify:parity` compares the contracts, then checks web types, unit tests, build,
production HTTP, Flutter analysis/tests and isolated backend regressions. It saves
logs and paired commit/source hashes in ignored `.parity-artifacts/automated.json`.
To count database verification as passed, supply `CONCURRENCY_DATABASE_URL` for a
**disposable loopback PostgreSQL database**, as enforced by the existing database
harness. Without it, SQL-only checks run but concurrency is marked unverified.
Existing native CI and the paired CI workflow supply this disposable database.
The script does not start a production database or deploy migrations.

The template command creates `acceptance-template.json`, with all entries marked
**unverified**. After executing the relevant scenarios, record each result, date,
environment, report/CI artifact location and tested outcomes; save as
`.parity-artifacts/acceptance.json`. A screenshot alone does not establish a saved
write or a permission boundary. Use successful persisted reads and negative
permission/failure checks as evidence alongside UI observations.

`gate:parity` exits nonzero when an automated check is missing/failed/unverified,
a required scenario has no current passed evidence, source hashes differ, or
acceptance evidence is more than seven days old. Failed/skipped device tests do
not become passes. Neither a passing unit suite nor the new paired smoke journey
fills every acceptance scenario. Evidence recording requires honest execution;
the gate validates completeness and revision binding, not the truth of an
operator's prose. Required GitHub branch/release protection is an account setting;
these changes do not silently alter it or deploy code.

## Browser checks

Install the locked Playwright dependency and browser engines, then run:

```sh
npx playwright install --with-deps chromium firefox webkit
npm run test:browser -- tests/browser/public.spec.ts
```

Projects cover desktop Chromium, Firefox, WebKit and an iPhone-sized viewport.
Tests cover public browse input/submission gating, private-page redirects, legacy
URLs and overflow, and save browse screenshots. Phone emulation is not physical
Safari acceptance. Traces/screenshots from test failures use ignored folders.
The ordinary web CI runs these tests after type/unit/build/HTTP checks.

## Paired UI journey with real disposable Supabase

The Flutter repository already contains `scripts/temporary-ui-backend.mjs` and
its setup guide at `documentation/android_ui_testing.md`. It uses a sanitized
schema plus current migrations, **real** local Auth/Postgres/Storage/Realtime,
generated accounts and a dedicated unlinked stack `salam-ui-tests`. Never use
hosted credentials or customer data. Docker/compatible runtime, the pinned
Supabase CLI, Android emulator, Java/Android tooling and Flutter are prerequisites.

From the Flutter repository, prepare/start/seed according to that guide. From web:

```sh
npm run test:paired-ui -- --native /path/to/Salam-Sourcing-Marketplace-App
```

The paired runner:

1. Checks public layouts on four browser projects.
2. Logs in through the web form and creates a direct enquiry for 12.25 kg.
3. Logs in through Flutter's login screen and submits a 122.50 quote through its
   actual form, with an empty optional lead time. It uploads a generated captioned
   photo through the native repository and sends text through the chat UI.
4. Web opens the quote notification (quote/enquiry IDs are deliberately distinct),
   receives the text/photo, opens and zooms its viewer, sends text and a captioned
   file through the attachment popup, accepts the quote and checks one persisted
   deal and a PDF response.
5. Flutter logs in as the buyer, reloads the accepted deal and both messages,
   and opens/resets/closes the photo received from web.

Native navigation directly opens the actual quote/chat screens after login and
repository retrieval; it does not automate all inbox navigation. Native photo
upload bypasses the OS picker. Physical picker/camera permissions, device push,
CAPTCHA, MFA, PDFs, background/process restart, all roles and every legal/billing/
support workflow remain separate acceptance cases in the contract. The runner
fails on a failed stage, preserves paired hashes/results, restores the generated
native config, and never labels this one journey full parity.

Always stop the isolated backend from Flutter after use. Config files/admin keys
remain ignored and are excluded from artifacts. CI artifacts can contain only
disposable test data; backend cleanup revokes its usefulness. Do not replace
these fixture credentials with production credentials.

## CI and release decision

Both normal client workflows now test the shared contract. Native database CI
runs real PostgreSQL concurrency tests instead of skipping them. Web's manual
**Paired client acceptance** workflow checks out an explicitly selected Flutter
ref, verifies both clients/database, starts the disposable Supabase stack and runs
paired UI acceptance on Android and the web browser projects, then cleans up.
It needs `PARITY_REPO_READ_TOKEN` with read-only access to the companion private
Flutter repository. No production Supabase credentials are needed.

For a release: select both exact revisions, run automated verification and the
paired journey, execute the remaining 18-scenario acceptance checklist, attach the
reports for that paired source snapshot, then require `gate:parity` to pass.
Reopen the relevant checklist/tests whenever a business contract changes.
