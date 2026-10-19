# About Salam Sourcing statement

- Added the supplied Canada-based global B2B marketplace statement, mission,
  planned member events and closing tagline verbatim, preserving bold emphasis.
- Website About (/platform) now starts with the company statement. The same
  component also appears on /about alongside the existing how-it-works content.
- Added native Account → About Salam Sourcing and a guest About entry. Both
  entry controls and the new screen's Back button include haptic feedback.
- Designed rose/peach/mint introduction, teal mission and gold events panels,
  with a red-to-slate tagline banner. Mobile remains scrollable with enlarged
  text; the events copy remains explicitly about future plans.
- Updated shared screen inventory and account menu metadata. No database or
  hosted Auth changes were needed; installed iPhone apps need a new build.

Validation: 32 targeted Flutter tests, 260 web tests, clean Dart analysis and
Astro checking, production build and 437 production HTTP assertions passed.
Exact paragraph text and layout were checked on both web routes in Chromium and
WebKit at 320/390/1280 widths, including 1.6x text. Actual native layouts were
captured at 390 and 320 widths; Account navigation and haptics were exercised.

