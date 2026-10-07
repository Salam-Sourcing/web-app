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

## Marketplace content, branding and security layout refresh

- `/platform` now explains discovery, RFQs, quote comparison, captioned messages, deal progress and company teamwork. It includes a four-step journey, separate buyer/vendor entries, company identity guidance, FAQs and an app callout.
- `/get-the-app` explains nine implemented mobile capabilities and how the phone and web share an account and company records. Both audience pages include four role-specific mobile feature cards. The app remains clearly marked Coming Soon, with no fabricated store links, release date, customer data or metrics. Workflow visuals are labeled as illustrations.
- The pages use existing icons, responsive feature cards, hover effects and finite entrance animations. Reduced-motion users receive no entrance animation or hover movement.
- Login, signup, password recovery and authenticator verification layouts have clearer hierarchy and spacing. Authenticator enrollment keeps the existing IDs, form actions, QR normalization, masked-secret handling, reveal/copy actions and cancellation cleanup. Scanning and manual entry use separate panels that stack based on available space; the QR retains its square proportions.
- Visible web and Flutter branding and the three-line wordmarks now say Salam Sourcing Marketplace. New authenticator enrollments use that issuer; existing factors are untouched. Legacy generic push-body comparisons remain compatible with stored notices. No new tappable Flutter control was introduced.
- Security tips cover unique passphrases, password managers, authenticator transfer when changing phones, private setup keys and automatic phone time. Reference: [Supabase password security](https://supabase.com/docs/guides/auth/password-security) and [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).
- Existing photo limits were inspected and left unchanged: listing/profile/company photos allow 5 MB; chat, enquiry and document attachments allow 10 MB, including images in those attachment flows. Recommended future policy is 5 MB for photos and 10 MB for PDFs, coordinated across client validation, repositories and storage enforcement.

Validation for this refresh:

- Web check: 0 errors, 0 warnings, 6 existing Firebase deprecation hints; production build passed.
- 216 web unit tests passed and 421 production HTTP smoke assertions passed.
- 18 public browser tests passed on Chromium, WebKit and the iPhone profile. The added regression navigates all four information pages and three auth pages at 320 px with reduced motion and checks FAQ keyboard opening/closing. Firefox was not rerun locally because its installed browser fails to launch with a profile-folder error; its CI run is still required for this patch.
- Manual web review found no horizontal overflow at the inspected 320/390/800/1024/1280 px views. An isolated, disabled authenticator design preview was used without enrolling or changing a real factor; the temporary route and server were removed. Browser viewport override was reset.
- Flutter analysis found no issues and all 231 Flutter tests passed, including the narrow header with enlarged text. These code checks do not replace an installed iOS/Android review of the updated wordmark.
- Formatting checks passed for changed files. The repository-wide formatter reports eight pre-existing differences in unchanged files.
- Changes are local; this refresh has not been committed or pushed.

## Photo upload limit change — 2026-10-07

The user approved a universal 5 MB photo cap. Web browser validation and server validation, plus Flutter picker and repository checks, now enforce 5 MB photos while keeping PDF attachments at 10 MB. Upload instructions reflect the split. Listing/profile/company photos already had 5 MB caps. No new tappable Flutter elements were introduced.

The applied backend migration `20261007062933_photo_upload_limits.sql` enforces this rule when new chat, enquiry, verification and deal attachments are attached. It checks both declared file metadata and the actual uploaded object's recorded size/MIME. Mixed Storage buckets retain their 10 MB overall limit for PDF uploads; the new attachment checks enforce the smaller photo limit. Existing files remain readable, and updates that only change moderation/status do not reject existing larger photos. A rollback removes the added guards without deleting files or records.

Validation: 240 web tests, 236 Flutter tests, clean Flutter analysis, clean web check (six existing hints), successful web production build and 421 HTTP assertions. Database checks include exact boundaries, one byte over, actual photo size despite fake PDF metadata, authenticated execution, old evidence updates and rollback. All 448 existing database security regressions passed, and the generated real schema test passed with the new migration. A temporary-table probe on the hosted backend confirmed the photo/PDF boundary and legacy update behavior without modifying business records. Hosted catalog inspection confirms all four invoker triggers are installed; the advisor findings are unchanged from the pre-migration baseline. The clients are local and not yet pushed.

## Mobile Join entry and Flutter security styling — 2026-10-07

The public web header keeps the red Join button beside Log in on small phones. The mobile label shortens to Join; desktop retains Join free, and both point to signup.

Flutter's Security & password screen now uses separate outlined password and authenticator cards, matching the web's icon accents, security tips and clear action spacing. Password fields have persistent external labels and screen-reader labels. Users can reveal passwords or open the email-verification controls; loading actions disable repeated submissions. Password reauthentication and the existing authenticator flows remain intact. Newly added native tap controls include haptic feedback.

Validation: all 244 Flutter tests passed and analysis found no issues. Eight targeted tests cover 320/390/768 px widths at normal and enlarged text, password mismatch, reauthentication, verification-code loading and haptics; they passed again after the final accessibility label change. Eighteen public browser tests passed on Chromium, WebKit and the phone profile, including visible Log in and Join controls at 320 px. Manual browser review at 320/390 px showed both buttons fitting without horizontal overflow. Flutter test fixtures rendered both cards using the app fonts for visual review. Web check and the production build passed, with the same six existing hints. The changes remain local and have not been pushed.

## Publication and narrow phone follow-up — 2026-10-07

The web and Flutter changes were published to their existing 1.0 branches. Flutter and database GitHub checks passed. The initial web run passed build, unit, production HTTP and 23 of 24 browser checks; the phone information-page case reported horizontal overflow on Buyers. Five local phone repetitions passed. The follow-up constrains audience grid tracks and child widths, allows headings and feature-card content to wrap, waits for fonts and layout to settle before measuring, and adds a font-unavailable regression for Buyers and Vendors at 320 px.
