# Review states, audience pages and app availability

Implemented October 6, 2026 in the web and Flutter working trees. No commit, deployment or database change is included in this update.

## Listing management and status presentation

- Web listing management has a dedicated overview, a prominent amber Under Review panel, a clock icon and Draft Saved → Under Review → Published progress. Review explicitly means private until approved and editing paused, rather than successful publication.
- Listing actions are grouped below the overview. Existing confirmation, verification, ownership and workflow checks remain in force. The edit form remains unavailable during review and after archival.
- Flutter has the same amber review explanation and clock badge. The title and status are stacked so a long title cannot be squeezed beside the badge on a narrow screen.
- Rejection feedback is shown only while Rejected, avoiding stale feedback after resubmission.
- Display-only status formatting covers listing, enquiry/publication, quote, deal/milestone, company verification/document, profile, support and billing labels, including quote/deal exports. Existing Flutter formatters already Title Case some of these labels. Both clients now share an eight-case status corpus in the parity contract.
- Database enum values, status filter option values, API bodies and workflow decisions retain their existing values. Capitalization applies only to human-readable labels.

## Public pages and navigation

The public header and footer link Buyers, Vendors and About Salam Sourcing. The platform page also links both audiences. `/buyers`, `/vendors` and `/get-the-app` use the shared responsive layout, page-specific descriptions, canonical/OG metadata and public sitemap. Production indexing remains restricted to the established production hostname; staging and authenticated records remain excluded.

Audience copy is original and based on implemented capabilities. B2B Market was used only as a reference for organizing information around buyers and vendors. No financing, payment-processing, guaranteed response times, review-time promises or fabricated adoption metrics were added.

| Features explained                                                                     | Web implementation inspected                                                  | Flutter counterpart inspected                                                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Discovery, category/price/MOQ/location/lead-time filters and saved suppliers/listings  | `discover.astro`, `catalog.ts`, `saved.astro`                                 | `discovery_home_screen.dart`, `saved_marketplace_screen.dart`                             |
| Related products, supplier photo and real five-star rating                             | `listings/[id].astro`, `SupplierSummary.astro`, `suppliers/[id].astro`        | `listing_detail_screen.dart`, `public_company_profile_screen.dart`                        |
| Saved filters and hourly/daily matching alerts                                         | `account/searches/index.astro`, `account/searches/[id].astro`                 | `saved_searches_screen.dart`                                                              |
| Public RFQs, drafts, attachments and supplier invitations                              | `enquiries/new.astro`, `enquiries/[id]/index.astro`, `procurement-actions.ts` | `create_enquiry_screen.dart`, `enquiry_detail_screen.dart`                                |
| Direct enquiries and connected conversations                                           | `listings/[id].astro`, `suppliers/[id].astro`, `enquiries/new.astro`          | `direct_enquiry_screen.dart`                                                              |
| Quote terms, version history, comparison, decisions and PDFs                           | `QuoteCard.astro`, `enquiries/[id]/compare.astro`, `server/quote-pdf.ts`      | `submit_quote_screen.dart`, `quote_comparison_screen.dart`, `marketplace_pdf.dart`        |
| Private messages, captioned images, PDFs, history, archive, report and block           | `messages/[id].astro`, `messages/index.astro`, `MessageAttachment.astro`      | `message_thread_screen.dart`, `messages_screen.dart`, `message_photo_screen.dart`         |
| Deal preparation/shipping/receipt, tracking, documents and separate company completion | `DealContent.astro`, `deals/[id]/index.astro`                                 | `deal_progress_screen.dart`                                                               |
| Eligible transaction reviews and company responses                                     | `suppliers/[id]/reviews.astro`, `server/account-actions.ts`                   | `company_reviews_repository.dart` and public company profile                              |
| Moderated product/service catalogue and company verification                           | `sell/`, `company/index.astro`                                                | `sell_screen.dart`, `manage_listing_screen.dart`, `company_profile_screen.dart`           |
| Supplier metrics and per-listing recorded activity                                     | `account/insights.astro`                                                      | `supplier_insights_screen.dart`                                                           |
| Buyer dashboard, company switching, team roles/scopes, plan limits and billing history | `enquiries/dashboard.astro`, `account/team.astro`, `account/billing.astro`    | `buyer_dashboard_screen.dart`, `company_team_screen.dart`, `account_settings_screen.dart` |
| Profile photos, authenticator security, notification preferences, support and exports  | Account/profile/password/preferences/support routes                           | Profile, two-factor, notification settings and support screens                            |

## Mobile app entry

A sticky Get the app entry is shared by public and signed-in web layouts. It explains iOS and Android availability and leads to `/get-the-app`.

The user confirmed the app is not public yet. Both store cards therefore say Coming Soon and provide Continue on the web. No fabricated store URL, broken download button, third-party QR service or release date is used. Add the real App Store and Google Play links after publication.

## Verification and remaining acceptance

- Focused Flutter tests exercise Pending Review, Rejected and Draft at 320 px, including editing eligibility, stale rejection feedback and layout errors.
- Both clients execute identical display-label cases from the shared parity contract.
- Production HTTP smoke checks cover the new anonymous routes, shared app availability entry, audience feature headings, navigation, sitemap entries, absence of fabricated store links and security headers.
- Local browser inspection checked the Buyers/Vendors pages and narrow navigation at 320/390/800/1024 px, with no horizontal overflow in the measured views, plus the desktop app availability page. Temporary viewport override was reset.
- Full paired validation is recorded in `.parity-artifacts/automated.json` and its seven check logs after this update. These automated checks do not replace the open browser/device acceptance scenarios or prove final release readiness.
- A signed-in web review-page walkthrough and installed iOS/Android acceptance remain part of the release checklist. No live product or moderation state was changed during this update.
