# Populated category filters and Flutter chat photos

Implemented 2026-10-06 in both repositories. The shared database migrations are
applied; client source changes are local and need deployment/a new Flutter build.

## Category availability

Discovery presents **All** followed by distinct active categories containing at
least one visible, published product or service. This uses the complete catalogue,
so categories are not lost when their only listing is outside the first 24 cards.
Drafts, paused listings, inactive categories/parents and suspended or unverified
suppliers do not contribute options. Authenticated reads exclude blocked companies.
Web supplier pages restrict categories to that supplier; saved-listing pages use
only the current user's visible saved listings. Creation forms continue to offer
the full active taxonomy so sellers can introduce listings in new categories.

Flutter refreshes available categories with discovery and resets a disappeared
selection to All. Existing categories remain available during a temporary network
failure; a successful refresh replaces them with current availability.

The Flutter/backend repository contains:

- `supabase/migrations/20261006132016_marketplace_available_categories.sql`
- `supabase/migrations/20261006133652_marketplace_category_guest_rls.sql`

`get_marketplace_categories(p_company_id, p_saved)` is a stable security-invoker
function with an empty search path. Guests retain existing listing RLS and public
column restrictions. They receive no private schema access and cannot query saved
items. The follow-up migration accommodates the hosted guest ACL, which differs
from the disposable test baseline. No customer records or existing grants change.
`get_marketplace_preview()` uses this same function for category options.

Hosted read-only verification returned three populated categories: Boxes & Cartons,
Flexible Packaging and Fresh & Frozen Food. Public preview and availability lists
matched exactly. These are current observations and will change with publication.

## Flutter photos

Message attachment MIME metadata is retained. JPEG, PNG and WebP attachments
render as inline previews; legacy records without MIME metadata use the filename
extension. Declared documents remain document attachments. Deleted messages do
not display attachments.

Tapping a photo opens a full-screen Flutter viewer with pinch zoom, pan, reset
zoom and close. Thumbnails and viewer downloads use the existing private
`message-attachments` Storage bucket and current authenticated session. Opening
the viewer performs a fresh authorized download; no persistent signed URL or
public bucket is introduced. Loading failures show a retry action. Photo open,
retry, close and reset controls include haptic feedback.

## Verification

- 393 disposable backend regression checks pass, including category availability
  beyond the first preview page, empty/draft/paused/inactive categories, supplier
  scope, blocked suppliers, saved-user isolation and guests without private-schema
  privileges. Existing rollback checks remain covered.
- 104 Flutter tests pass. New tests cover MIME handling, inline embedding, fresh
  viewer authorization, zoom reset/close, haptics, failures/retries, document
  attachments and 320/390px layouts with enlarged text. Disappearing category
  selections return to All. Flutter analysis reports no issues.
- 131 web tests pass; Astro reports zero errors/warnings and six existing hints.
  Production build and 348 development HTTP assertions pass. Local public HTML
  has All plus exactly the three live populated categories.
- Supabase security advisors report no notice for either category/preview function.

Automated fixtures do not mutate production customer data. Native release/device
acceptance and a real web-to-Flutter photo conversation remain release checks.
