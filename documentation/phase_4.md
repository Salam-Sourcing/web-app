# Phase 4 — deals, private documents, completion, reviews and image embeds

Implementation delivered on 2026-10-05. Live cross-client acceptance remains open.
This phase was requested while the earlier release gates were still pending.

## Features and entry points

- Accepting a quote opens its deal. Enquiry details offer the authorized deal link;
  company deals and the buyer dashboard are accessible from Enquiries/Account.
- `/deals`: selected-company, permission-aware deal list with active/completed/
  cancelled/disputed/all views and bounded 24-record pages.
- `/deals/:id`: agreed → preparing → shipped → received milestones. Preparation
  and shipment belong to the supplier; receipt belongs to the buyer. The page shows
  shared notes, company actors, timestamps, delivery date and tracking/reference.
- Milestone forms require confirmation and the current next step. Server checks and
  the existing locked database RPC reject stale, duplicated or inappropriate actions.
  Completed/cancelled/disputed deals do not offer further delivery updates or uploads.
- Buyer/supplier completion is independent of receipt. Fresh backend eligibility
  controls each company's confirmation and one-review-per-company eligibility.
  Confirmations explicitly explain their permanent effect and both-party obligations.
- Reviews include rating, reviewer/role, original agreed item, verified-transaction
  label, text, company response/date, authorized response editing and reporting.
  Published review pages use the existing 20-record pagination contract. Profile and
  Account links expose company reviews; response actions require the selected
  reviewed company and management permission.
- `/enquiries/dashboard` uses the current dashboard RPC for company counts and
  the next 50 deadline/delivery records, each linked to its correct enquiry/deal.

## Private files, retries and image embeds

The private `deal-documents` bucket is separate from enquiry files. Its hosted
policy allows only authorized procurement/sales actors of the buyer and accepted
supplier. Other bidders and revoked permissions cannot access metadata or bytes.
The web rechecks the selected company before signing a five-minute URL. As with
Flutter, an issued URL remains valid until expiry; it is never made public.

Uploads accept PDF/JPEG/PNG up to 10 MB, check file signatures, use immutable Storage
uploads and the existing cleanup journal/RPC. The upload UUID is retained on retry.
Unique Storage-path metadata uses insert-on-conflict-ignore and readback to prevent
overwriting an attached document. Already committed metadata can be reconciled
after completion; new uploads to a completed deal are rejected. Attached documents
have no delete/replace controls. No new Storage policy or table grant was added.

Message JPEG/PNG/WebP attachments render inline in server-rendered history and live
updates. Images use the same-origin authenticated media endpoint and private,
no-store responses; raw paths and signed tokens are not exposed. Deleted messages,
wrong-company access and inaccessible Storage still fail closed. Other MIME types,
including PDF and SVG, are not embedded as pictures. Images preserve aspect ratio,
offer explicit open/download links and show a fallback after loading failure.
Unchanged messages keep their DOM/image nodes during refresh, avoiding image flicker.

## Exports and UI

Quote and deal exports share an embedded-Inter A4 writer with word/long-token wrapping,
multi-page headers, page numbers and UTC generation time. Deal summaries include
buyer/supplier identities, original currencies/values, accepted quote version/terms/
expiry/notes, delivery details, completion timestamps, history and document names.
Storage paths, signed links and file bytes are not embedded in exports. Quote
exports now identify the buyer and include the business-summary disclaimer too.

Preview pages provide an authenticated same-origin PDF iframe, explicit download,
open/print and file sharing when the browser supports it. Unsupported/native-sharing
failure leaves the download fallback. Public/private HTML remains protected against
framing; only PDF exports explicitly allow same-origin embedding. No printing,
sharing or business-record writes happen automatically.

Responsive grids stack below tablet widths, long file/company/product names wrap,
actions remain with their owning section, and five-tab navigation wraps on narrow
screens. Section headings, review identities/ratings and verification labels were
verified after formatting. Single-company accounts retain the hidden company switcher.

## Evidence

- Hosted `get_deal_progress`, `advance_deal_progress`, `get_deal_review_state`,
  `confirm_deal_completion`, review/dashboard RPCs, document constraints, private
  helper functions, RLS policies and bucket limits were inspected read-only.
- Web: **93 tests passed**, including party/permission scope, company changes,
  next/stale transitions, explicit confirmations, fresh review eligibility,
  private document signing at 300 seconds, invalid dates/ratings/file types,
  inclusive 10 MB document limit, reporting and multi-page PDFs.
- Existing backend: **367 isolated regression checks passed**, including other-bidder
  document denial, revoked permissions, immutable attached bytes, milestone races,
  independent receipt/completion and review/response/report authorization. No hosted
  account, document or business record was changed by these tests.
- Astro check: no errors or warnings; one pre-existing callback unused-value hint.
  Cloudflare production build passed.
- HTTP: **232 development** and **250 production** assertions passed for public/
  protected routes, no-store headers, redirects, authentication and cross-site writes.
- Isolated browser fixtures verified supplier/buyer controls, receipt, independent
  completion and review unlock, response editing, cancelled-state restrictions,
  inline pictures/download links and mobile composer spacing.
- Layout checks at **320, 390, 768 and 1280 px** found and corrected narrow-tab
  overflow. Dashboard headings and review metadata were confirmed in the final DOM.
- Sample two-page deal and quote PDFs were rendered and inspected on every page;
  extracted identities, values, currencies, accepted terms, notes, file names and
  disclaimers matched fixtures. The long-content unit fixtures produce more than
  three pages without dropping the record.

## Remaining release acceptance

Deploy updated web code, then complete the Phase 4 web ↔ Flutter journey with two
real authorized accounts/companies and a restricted team member. Verify actual
document delivery and expiry, role/block/session changes, duplicate clicks from
multiple tabs and review publication/response/report results. Test native file
sharing and print on the intended desktop/mobile browsers. The isolated fixture
browser tests and backend regressions do not replace these live release gates.

No backend migration or Flutter source/build changes were needed in this phase.
The earlier shared concurrency migration and client retry release checks remain
documented in [concurrency_fixes.md](concurrency_fixes.md).

Isolated fixture screenshots: [desktop deal](screenshots/phase-4-deal-desktop.png)
and [mobile message image](screenshots/phase-4-message-image-mobile.png). The sample
photo uses the local logo asset solely to exercise authenticated raster delivery.

## Messaging follow-up: HTTP preview sending and photo viewer

The reported silent Send failure was reproduced in an isolated browser fixture
on a desktop browser using an HTTP LAN origin: `isSecureContext` was false, `crypto.randomUUID` was
unavailable, and the old submit handler threw before displaying feedback. The
web client now generates a cryptographically random v4 UUID using
`crypto.getRandomValues` when the native UUID method is unavailable. Preparation
errors and whitespace-only drafts display an alert and retain the draft.

An in-page chat photo viewer now supports Close, Download, previous/next loaded
photos, Escape and arrow keys. It handles server-rendered and refreshed messages
through delegated clicks, wraps long filenames on mobile, and shows loading and
unavailable-photo feedback. Downloads and images use the existing authenticated
media endpoint. The viewer closes and clears its media when the private workspace
locks, the page hides, the client goes offline, logout occurs, or the attachment
is removed. No backend or Flutter source changes were needed for this web fix.

Verification: **128 web tests**, Astro check **0 errors / 0 warnings** (six existing
hints), production build, **327 production HTTP assertions** and **309 development HTTP assertions** passed. The restarted phone-test hostname returned HTTP 200. Browser
fixtures reproduced the failure before the fix and confirmed sending afterward
on the same HTTP origin and on secure localhost. A simulated lost acknowledgement followed by Retry
created one message with the original UUID and preserved an edited draft. Viewer
navigation, Escape, unavailable media, private-content locking and narrow
320/390 px layouts were checked with fixture photos. These checks do not claim a
live customer-account send or a deployed staging release.
