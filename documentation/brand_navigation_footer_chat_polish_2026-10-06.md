# Branding, web navigation, footer and chat receipts — 2026-10-06

## Public page labels

The three labels under guest search describe marketplace capabilities: products
and services, direct business conversations, and enquiries/quotes. They are
informational rather than controls. A visible On Salam Sourcing label and a
Marketplace features accessible label clarify their purpose. Guest sign-in gates
and public/private data boundaries are unchanged.

## Web polish

Public and signed-in layouts share a branded footer with the Salam emblem,
two-line wordmark, platform description, grouped Explore and Help/information
links, copyright and a short closing line. It wraps into two columns on phones;
signed-in footer padding keeps links clear of the fixed mobile dock. Short pages
keep the footer at the bottom without stretching content cards.

Main navigation and category chips have hover and keyboard focus feedback. Saved
listings & suppliers includes a heart. Native file inputs retain their labels,
keyboard interaction, filename and validation, with a styled Browse/Choose File
button. Desktop and mobile workspace navigation keep Sell's icon in a red circle
regardless of the current tab, matching Flutter.

Web message receipts are one muted tick after confirmed send, two colored ticks
for the backend's seen state, and a small clock for a pending local draft.
Failure/retry stays visible. Initial server-rendered bubbles and refreshed history
share the same receipt paths and accessible Sent/Seen labels. No seen or successful
send is inferred from a local draft or elapsed time.

## Flutter wordmark and platform icons

A shared SalamBrand widget uses the existing emblem and the same blue-gray Salam
and red Sourcing arrangement as web. Signed-in home, guest Browse and auth use
it. Its graphical wordmark does not scale independently with body text, avoiding
header overflow at enlarged accessibility text; it has one accessible brand label.
Existing navigation taps retain their haptics; no new Flutter tap action was added.

The launcher artwork is built from the existing PNG emblem and Inter glyph paths,
without redrawing or inventing a logo. A white square master and Play Store PNG
are in assets/branding; all filenames already referenced by the iOS AppIcon
catalog have matching sizes and opaque RGB images. Android's five legacy density
icons and five adaptive foregrounds use the same branding. The adaptive layer
keeps the mark inside the safe area, with a white background and Android round
icon mapping. Existing bundle/package identity is unchanged.

Reproduce assets from the web repository:

    node scripts/generate-native-brand-icons.mjs --native /path/to/Flutter/repo

The generator uses the existing web build's Sharp dependency and bundled fontkit.
Platform guidance consulted: [Apple asset catalogs](https://developer.apple.com/documentation/xcode/configuring-your-app-icon)
and [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

## Verification and remaining acceptance

Focused Flutter tests cover a 320-pixel app bar with doubled body text scaling,
along with the existing narrow tab/auth/card layouts. Web receipt tests distinguish
pending, confirmed and seen states. Browser inspection confirmed the branded
footer, red Sell icon, saved heart, file picker button, and actual single/double
receipts in an existing conversation. No message was sent or image uploaded during
inspection. Opening a conversation retains the usual read-receipt behavior.

The final paired verification records exact revision results in
.parity-artifacts/automated.json and adjacent logs: web types/tests/build/HTTP,
Flutter analysis/tests and disposable PostgreSQL checks. The shared acceptance
contract includes these outcomes. App icons require a new installed Flutter build;
physical Android/iOS launcher shape, cached-icon replacement and device acceptance
remain part of the release gate. No commit, push or production web deployment is
included in this change.

Local testing: http://karamullahs-mac-mini.local:4321/.
