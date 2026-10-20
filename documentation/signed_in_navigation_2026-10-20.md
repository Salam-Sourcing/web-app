# Signed-in entry and logo navigation — 2026-10-20

## Behaviour

- Verified web users visiting `/` receive a private, non-cacheable 303 redirect to
  `/discover` before public homepage content or its catalog is loaded.
- Authenticated web header and footer brand links point directly to `/discover`.
  Public page navigation resolves verified workspace state for the same links.
- Signed-out users keep the PDF-inspired public homepage. Expired sessions may
  browse it; MFA, account-access and service failures retain the normal gate.
- The native authenticated shell always opens the signed-in Discover catalog.
  Guest homepage content is no longer selected for signed-in accounts.
- The native top-left logo switches to Discover and emits selection haptics.
  Existing guest search/filter/listing/destination handoff remains intact.
- Successful native sign-in replaces the guest/login route stack. Back cannot
  reveal the guest landing page. The existing profile and MFA bootstrap checks
  still decide whether the account can enter the signed-in shell.

## Verification

- 267 website unit tests, including seven verified-session redirect, expired
  session, cookie-chunk and security-gate cases.
- 18 public/home/category browser checks passed in Chromium and WebKit.
- 40 targeted Flutter tests passed, including logo navigation with haptics,
  removal of guest/login history, large text, guest browse, tabs and About.
- Astro checking and Flutter analysis are clean.
- The existing opt-in paired authenticated browser journey now also checks root
  redirection and the header logo. That credentialed journey requires the
  disposable backend and is not claimed as executed by the public test run.

No database/schema changes or authentication bypasses were introduced.
Git publication is separate from deployment and a new installed mobile build;
those rollout steps remain required.
