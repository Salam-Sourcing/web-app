# Pre-push verification

Included country flags, password updates, separate security choices, unread message badges, the local hostname allowlist and their tests/documentation. Both clients share the updated screen inventory and country assets. Web CI includes the new password and security browser tests.

Validation: 260 web tests, 288 Flutter tests, 21 browser checks across Chromium/WebKit/phone and 457 isolated PGlite database checks passed. Full Astro checking and Dart analysis have no errors; the web production build passed. Native database concurrency tests require CI's disposable Postgres services. Local Firefox could not launch because its profile directory was unavailable; CI retains Firefox coverage.

The hosted database migration history already contains unread_message_count (20261008172834). This source push does not apply database migrations or change hosted Auth settings. Installed mobile clients need a new build.
