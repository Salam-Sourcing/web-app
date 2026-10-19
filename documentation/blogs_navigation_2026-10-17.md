# Shared Blogs navigation

- Added Blogs alongside Filters & sort and Saved on mobile Discover. Guest
  browsing also has a Blogs button. Both include haptic feedback and open the
  website's public /blogs page in an in-app browser, with failure/retry feedback
  and duplicate-launch protection. Website articles remain the shared source.
- Kept the five main mobile tabs: Discover, Enquiries, Sell, Messages and Account.
  The website retains its public menu/footer and signed-in Blogs navigation.
- WEB_APP_URL configures the mobile website origin; the default is
  https://test.salamsourcing.com. For a local preview build, use
  --dart-define=WEB_APP_URL=http://karamullahs-mac-mini.local:4321.
- The web landing page currently shows its empty state. Article publishing/CMS
  is still outstanding. No database or hosted Auth configuration changes.
- Updated both clients' shared navigation inventory. Guest browse verification
  now waits for product scrolling to settle before tapping.

Validation: 40 targeted Flutter tests and 260 web tests passed. Full Dart
analysis is clean. The Discover layout was captured with the real fonts and
checked at phone width; search and five-tab navigation remain usable. The local
/blogs URL returns HTTP 200. Web build, type checking, production HTTP and
Chromium/WebKit checks passed with the accompanying web Blogs page. Installed
mobile clients need a new build; local changes are not a store rollout.
