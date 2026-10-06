# Public browse, clean URLs and verification

Implemented 2026-10-06. The website changes are local; the shared Supabase migration has been applied. Authenticated Flutter operations retain their existing database grants and RPCs. No Flutter controls were added in this change.

## Visitor flow

- `/` is the public marketplace preview with approved product/service cards, thumbnails, company names and locations. Signed-in visitors with a valid workspace continue to `/discover`.
- Guests can type search terms, choose a category and edit additional filters. Nothing submits automatically. Search, Enter and Apply filters open a native sign-in dialog. Closing it keeps the draft; login/signup receive the selected filters through the existing safe continuation path.
- Product and supplier links open the same sign-in prompt. Modified clicks and browsers without JavaScript reach the protected route and receive the server-side login redirect.
- The previous marketing homepage is preserved at `/platform`, linked as About Salam in the public header/footer. `/about` remains How it works.
- `/plans` has exactly three announced-later placeholders. No pricing, plan names or included features are invented, and actual account billing records are unchanged.
- Company verification checks appear only on the company profile screens (`/company`, `/suppliers/:id`). Hover, focus or tap opens the explanation and Learn more points to `/verification`. Escape, scrolling and outside clicks dismiss it. Company badges were removed from chat, listing/supplier cards, listing details, enquiry details, quote cards and quote comparison. Live inbox refreshes follow the same rule. Verified-transaction review labels describe a separate review property and remain.
- Public search controls, dialogs, listing actions, plan cards, header/footer and company profile actions use consistent spacing and responsive layouts. Company profiles include location and a description fallback; report/block links are separated from primary actions.

## Routing and access

The customer URL prefix is removed: `/discover`, `/messages/:id`, `/enquiries`, `/account`, `/company`, `/sell`, `/deals`, etc. Middleware recognizes all private roots and descendants; pages and APIs retain their existing authorization and company checks. Notifications, exports, forms, account continuations and service-worker links use the clean paths.

Old `/app/...` bookmarks, invitations and notification links receive a 308 redirect to the corresponding protected URL, preserving their query. Unknown/unsafe legacy paths resolve to `/discover`. Auth continuation permits only private routes and explicitly allowed discovery filters; arbitrary query parameters and fragments are dropped. Auth-dependent homepage responses and private/API responses bypass browser/CDN caching.

## Shared backend

Migration in the Flutter/backend repository:
`supabase/migrations/20261006055825_public_marketplace_preview.sql`.

- `get_marketplace_preview()` is a no-argument, security-invoker SQL RPC for anonymous visitors. It returns the latest 24 approved listing cards. Category names now come from the whole visible catalogue through `get_marketplace_categories()`; see [category filters and Flutter photos](category_filters_and_chat_photos.md).
- Existing RLS excludes unpublished listings and listings belonging to suspended or unverified companies. It remains the authority for public visibility.
- Anonymous table-wide SELECT was replaced with explicit public-card column grants on listings and listing images. Description, specifications, prices and creator IDs cannot be fetched anonymously; full filtered-search and company-profile RPCs remain authenticated.
- The preview response uses only safe card fields. Thumbnail requests use a cookie-free anonymous publishable-key client, recheck current publication through RLS, download the primary image from the existing bucket and return an allowed raster image. They never inherit a customer session or expose a signed private URL.
- Authenticated grants and RPC contracts are unchanged. The migration does not edit customer listings, accounts, messages, subscriptions or files.

Initial hosted read-only checks confirmed 9 preview cards, 14 taxonomy categories, denied anonymous description/specification/table-wide image access and filtered-search execution, and retained authenticated description access. The subsequent populated-category update returns 3 available categories, with matching public-preview categories. Counts are observations, not product promises.

Supabase advisors did not flag the new invoker function. Existing notices remain for backend function access, policies and indexes. The limited, intentionally public `get_company_summaries` helper is still flagged by the generic [anonymous definer-function advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable); this migration does not broaden that helper's output or grants.

## SEO

Public pages are server-rendered with descriptive titles, descriptions, canonical URLs and social metadata. `/sitemap.xml` contains only the public browse and information pages. `/robots.txt` permits public crawling on `salamsourcing.com`/`www.salamsourcing.com` and disallows private routes. Local/staging hosts remain noindex and disallow crawling.

At production cutover, set `SITE_URL=https://salamsourcing.com` (or the chosen www origin), align Astro's `site` setting and auth callback allowlist, and verify production robots/canonical/sitemap output. Submit the sitemap in the site's Google Search Console when that account is ready. Public content can be indexed; descriptions and details behind login cannot. Ranking is not guaranteed. See [Google's SEO guidance](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Verification evidence

- 131 web unit/action tests pass.
- Astro check: 0 errors, 0 warnings; 6 existing hints.
- Production build, 348 development HTTP assertions and 372 production HTTP assertions pass, including legacy redirects, protected clean routes, filtered login continuation, public pages, three plan cards, sitemap and auth-dependent homepage caching.
- 384 backend security regression checks pass in a disposable database, including public-field restrictions and immediate removal of paused/unverified/suspended-company previews. No production fixture writes.
- Browser checks cover typing without a prompt, Search/Apply prompts and preserved filters, product prompts, Escape focus return, verification explanation/Learn more, platform content and chat without a company badge.
- Isolated responsive fixtures checked browse at 320/390, sign-in dialog at 320/390, supplier profile/popover at 390, and plans at 320/768/1280. Inspected mobile pages have no horizontal overflow or unlabelled form controls. Fixtures are separate from the local user-test server and cannot write live account data.
- Screenshots: [browse desktop](screenshots/public-browse-desktop.jpg), [mobile sign-in prompt](screenshots/public-browse-login-mobile.jpg), [company profile](screenshots/company-verification-desktop.jpg).

Live end-to-end login continuation with a real buyer/supplier account and staging deployment acceptance remain release checks. Browser push configuration and invitation-email rollout remain deferred as previously agreed.
