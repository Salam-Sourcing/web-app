# Marketplace presentation, guest browsing and company photos

Implemented in the current web and Flutter working trees on 2026-10-06. Existing
uncommitted parity work was preserved. This follow-up was not committed, pushed,
or deployed as a client release.

## Changes

| Area              | Web                                                                                                                                                                                                                                                            | Flutter                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest browse      | Public cards now use the signed-in card image, supplier, title, category and location layout. Price/order details remain sign-in protected. Typing is allowed; submitting searches/filters or opening a product asks for sign-in.                              | Signed-out bootstrap now opens public Browse using a separate anonymous client and the existing bounded preview RPC. Search/filter submission and product taps ask for sign-in, then retain the intended query/category/product through the existing MFA/account boundary. |
| Product details   | Supplier identity, company avatar, location and actual rating out of five appear above the right product details. Related products appear below, using the same category and excluding the current listing.                                                    | Same supplier information and real rating before product details; related product cards below, with haptic navigation/retry.                                                                                                                                               |
| Company photos    | Managers can upload/update a JPEG, PNG or WebP up to 5 MB on Company profile. Avatar appears on company profile, workspace and supplier summary.                                                                                                               | Same upload bounds, shared photo and avatar locations. File picker and new controls include haptics.                                                                                                                                                                       |
| Company workspace | Consistent icon tiles for profile, team, deals, reviews, billing, insights and saved items; permission/invitation details collapse. Tiles follow existing role/scope access.                                                                                   | Company settings become one Company workspace entry. Profile/photo/verification and membership tools are accessible there; a company selector appears only for multiple companies. Saved items use a heart icon.                                                           |
| Save feedback     | Small accessible toast disappears after 2.8 seconds; errors remain longer.                                                                                                                                                                                     | Existing snackbar feedback retained.                                                                                                                                                                                                                                       |
| Messages          | Compact search/conversation layout. Routine connected/up-to-date, sending and sent notices are hidden. Failed/unconfirmed sends retain visible errors and safe Retry. Enter submits a ready draft, Shift Enter inserts a line, and IME composition is guarded. | Existing composer and retry behavior retained.                                                                                                                                                                                                                             |

Verification checks remain on company profile pages, and are not added to product
summaries or chat. Ratings are derived from existing company reviews; an unrated
supplier displays empty stars and “No reviews yet”. Related-product failure shows
an explicit retry instead of a misleading empty section.

## Shared backend addition

Native migration `20261007001219_company_profile_photos.sql` was applied to project
`stjtdlwonexcgnhmgfqw` on 2026-10-07 UTC (2026-10-06 Edmonton time).

- `company_photos` is protected by RLS. Anonymous reads/writes are denied;
  authenticated metadata reads follow existing active-account/company visibility.
- `company-photos` is a private Storage bucket with a 5 MB JPEG/PNG/WebP limit.
- `set_company_photo` checks active account, company management role, owned
  immutable upload path, object ownership, MIME and size. Company/file locks and
  comparison of the previous photo reject stale replacement attempts.
- Both clients use the existing persistent upload intent/cleanup systems. Cleanup
  claims protect referenced files and retry failed deletion of owned old bytes.
  Other uploaders' bytes are never deleted by a replacement uploader.
- Existing Storage rate/quota limits also apply to this bucket. No existing
  business records or company photos were written during verification.

Hosted readback confirmed RLS, private bucket/MIME/size limits, authenticated-only
attachment, no direct metadata update, and cleanup/budget integration. The
advisor flags the intentionally authenticated `SECURITY DEFINER` attachment RPC;
its authorization guards are covered by the database regressions. See the
[Supabase advisory explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Evidence and remaining acceptance

- Web: 198 unit/contract tests, type checks and production build passed.
- Flutter: 191 unit/widget/contract tests and clean analysis passed.
- Disposable real PostgreSQL: 436 security regression checks passed, including
  11 company-photo checks (manager/member/anonymous access, stale replacement,
  replay, cleanup claims and suspended supplier visibility).
- Production web HTTP smoke: 378 assertions passed without live business writes.
- In-app browser: guest card layout and sign-in prompts, signed-in supplier
  summary and related products, account workspace, company photo form and chat
  status/composer layout were inspected against the local website.
- New Flutter guest widget tests exercise 390 × 844 layout, typing, product/filter
  sign-in prompts and haptic feedback; private fields are not hydrated from preview.

Physical Android/iOS photo picker/upload and a real cross-client company-photo
replacement still need device acceptance after distributing a build. Live chat
messages were not sent to another company during this review. Keyboard decisions
are regression-tested; full browser/Android paired workflow and all release
checklist scenarios remain unverified. The shared contract was updated for these
capabilities, and the release gate must remain blocked until current execution
evidence exists. Browser push remains explicitly deferred.

Use [the parity runbook](../parity/README.md) for the paired release verification;
automated counts and a few inspected pages do not establish full 1:1 acceptance.
