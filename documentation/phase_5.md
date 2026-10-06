# Phase 5 — account tools and productivity

Implemented 2026-10-05 (verification continued into 2026-10-06 UTC). Live
cross-client acceptance remains open. Browser push is deferred separately.

## Features

| Route                    | Behavior                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/account/profile`       | Own name, contact number, country, account metadata and Auth email change. Confirmation stays bound to the originating browser and existing MFA checks.      |
| `/account/team`          | Actual members/pending invitations, create/revoke, role changes/removal and copyable code/website link. Defaults new invitations to member.                  |
| `/account/team/:userId`  | Owner permission restrictions; role defaults and an explicit empty custom restriction are distinct.                                                          |
| `/invitations/:uuid`     | Company, assigned role and expiry preview; verified invited email, issuer authority, expiry/revocation and seat limits remain guarded by the shared backend. |
| `/account/billing`       | Actual plans, active subscription/limits, latest 50 invoices and pending requests. Start/change/cancel use existing RPCs and explicit confirmation.          |
| `/account/notifications` | Latest 100 own updates, global unread indicator, nonblocking automatic polling, explicit refresh, read/all-read/delete and exact record navigation.          |
| `/account/preferences`   | Message, enquiry, quote, deal, listing-review and saved-search preferences. Browser push stays disabled without configuration.                               |
| `/account/searches`      | Up to 25 private saved listing/RFQ searches, create/edit/delete, hourly/daily alert opt-in and current matches.                                              |
| `/account/insights`      | Current company aggregates for 7/30/90 days and latest 100 listing metrics; unavailable ratios/reply times are shown honestly.                               |
| `/account/support`       | Own support requests, versioned replies, appeals, ownership recovery using eligible existing team members, and private personal-data download.               |

Company profile/verification and the selected-company buyer dashboard reuse their
earlier phase implementation. Discover and enquiry filters now offer named saved
searches. New search alerts start off; the existing matching worker and global
preference control opt-in delivery to the in-app notification center.

## Shared contracts and privacy

Current hosted definitions were inspected before implementing the account forms.
`customer_support` and `panel_customer_export` are now deployed, unlike the
original review inventory. Existing team, billing, matching and insights RPCs are
reused. No account-tools schema redesign or service-role browser client is needed.

Effective scope checks apply independently of the UI. Team administration also
requires owner/admin authority, administrator appointment requires ownership,
and overrides only remove permissions within the assigned role's ceiling.
Backend checks remain authoritative for invitation recipient, current issuer
authority, duplicates, seat limits and concurrent changes.

Notification routing loads an owned notification row and resolves the underlying
RLS-filtered record using fresh company access and effective permission checks.
Untrusted notification links/data never control redirects. The company cookie is
changed only after record authorization succeeds. Deleted searches, revoked
membership and unavailable records fail closed.

Email-change callbacks use a separate verified flow and browser nonce; they
cannot authorize password recovery. With secure dual email confirmation, the
nonce remains until Auth reports the change complete. Invitation `next` paths
survive login, signup confirmation and MFA without reusing Auth's PKCE `code`.
Actual dual-confirmation delivery still needs acceptance on the target provider.

Support replies include the current version and return a useful conflict when
another reply changes it. Ownership recovery presents only active existing
members of owned companies. Unknown mutation outcomes ask users to check current
records before retrying.

The personal JSON export calls the existing own-user RPC across all 13 sections,
100 records per page, with a 100-page/10-MB browser bound. It rejects foreign
subjects, malformed sections and oversized exports rather than returning a
partial file. The same-origin POST download is private and no-store; email support
remains available when the operation cannot complete.

## Layout checks

Account tools use the existing shell, aligned section actions and wrapping grids.
The company switcher remains hidden for single-company accounts. Verification
labels remain attached to the relevant record, rather than every account screen.
Names now preserve spacing between first and last names.

Isolated browser fixtures were inspected at 320/390 and 1280 pixels for profile,
teams, restrictions, invitation acceptance, billing, notifications, preferences,
saved-search editing, support and insights. Recorded viewport/document widths
matched and visible form controls had labels. Billing was also inspected with RTL
and a 1.8x root font. These are synthetic layout checks; real screen-reader,
keyboard, zoom, device and live cross-client acceptance remain open.

Billing plan cards are separate components so formatting cannot remove their
name/price siblings. Rendered plan headings, support request titles, form actions
and invitation/company identities were checked after formatting.

Saved layout evidence: [mobile billing](screenshots/phase-5-billing-mobile.jpg),
[desktop billing](screenshots/phase-5-billing-desktop.jpg) and
[mobile support](screenshots/phase-5-support-mobile.jpg). These show fixture data,
not live customer records.

## Local verification

- Web behavioral suite: 125 tests, including account permission boundaries,
  invitations, preferences, support conflicts, complete/bounded exports, exact
  notification destinations and service-worker privacy.
- Astro check/build and production HTTP checks are recorded with Phase 6 below.
- Flutter: clean analysis and 95 passing tests after shared CAPTCHA and invitation
  compatibility changes; configuration tests pass too.
- Shared isolated database regressions: 378 checks, including the prepared
  browser registration extension. No hosted customer fixtures were created.

## Acceptance still required

Use distinct owner/admin/restricted users to accept invitations, modify roles and
overrides, hit seat limits and revoke already-open access on both clients. Confirm
actual profile/email confirmation, plans/invoices, preferences, saved-search
alerts, support replies/recovery and private export against their live records.
Local implementation is complete; this evidence does not close the launch gate.
