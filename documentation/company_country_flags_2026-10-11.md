# Company-profile country flags — 2026-10-11

Public supplier profiles (`/suppliers/[id]`) and the managed company profile
(`/company`) now show a small decorative flag alongside country/location text.
Flutter's public and managed company profile screens use the same catalogue and
artwork. Flags are bundled SVG files, so they do not depend on emoji support or
third-party image requests. The existing country value is neither rewritten nor
inferred from the city/province. Unknown country values display text only.

`parity/countries.json` maps 250 countries/territories, two-letter codes, English
names and common aliases. Keep this file and the corresponding flag assets in
sync with Flutter. Source: flag-icons 7.5.0 (MIT); the retained license and notes
about US/UM marker expansion are in `public/flags/` and Flutter `assets/flags/`.

Validation: country lookup regression fixtures passed; Astro production build
passed. Flutter's 13 targeted tests and changed-file analysis passed; a private
render check decoded every flag and checked narrow layouts with enlarged text.
Shared country catalogue and all SVG assets were byte-compared across clients.
Full `npm run check` finds an existing unrelated unresolved browser-only import
of `/src/lib/message-badge.ts` in `tests/browser/message-badge.spec.ts`; that
separate work was left intact. No database changes or deployment were performed.
