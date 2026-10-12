# Website password update fix

The hosted Auth logs showed password updates rejected because the website omitted the current password required by Supabase. Added a current-password field and forward its exact value through the existing authenticated updateUser call. Supabase still validates passwords, reauthentication codes, recovery sessions, and MFA; no Auth configuration or database changes were made.

Made the email-code request button visible in a dedicated panel. Successful requests focus the code field, mark it required, clear a previously entered code on resend, and explain the next step. Current-password, weak-password, and password-update errors now use relevant messages. Recovery sessions can leave the current password blank.

Validation: targeted server action tests and isolated browser journeys cover password and nonce forwarding, recovery omission, MFA gates, provider errors, code requests and resends, rate limits, keyboard focus, and password visibility.

Results: 47 server/account/security tests passed; nine browser tests passed in Chromium, WebKit, and the iPhone layout. Production build passed. Desktop and phone captures were visually checked with no horizontal overflow. Firefox could not launch because its profile directory was unavailable, including after a temporary-directory retry. Pre-push verification fixed the absolute browser-test import and full Astro checking now passes. Live account passwords were not changed during testing.
