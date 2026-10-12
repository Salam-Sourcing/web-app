# Security settings choices

Account now opens /account/security with Change password and Two-factor authentication choices. Password settings remain at /account/password; authenticator settings are at /account/two-factor. Both detail pages link back to the security choices. Recovery links still open the password form directly. The mobile companion app uses the same navigation, with haptic feedback and preserved password-update results.

Validation: 15 isolated browser tests passed in Chromium, WebKit and the phone layout; production build passed. The mobile companion passed 25 targeted tests and clean analysis. Actual mobile widgets and the web choices component were captured for visual review. No database or hosted Auth changes; local source only.
