# Chrome Extension — DEPRECATED

**Effective: 2026-07-08**

The element picker has been integrated directly into `ab.js` (the site snippet). The Chrome Extension is no longer needed and is no longer part of the user onboarding flow.

## Why

The extension did exactly two things: parse URL parameters and inject `content-picker.js`. The `ab.js` snippet can do both — it already runs on the user's site and has direct access to `location.search` and the DOM.

## Migration

- Picker logic moved to `ab-tool/public/ab.js` (picker mode activated via `?ab_pick=<testId>`)
- Figma plugin now uses query parameters (`?`) instead of hash (`#`)
- Onboarding, dashboard, and docs no longer reference the extension

## CWS Listing

The Chrome Web Store listing remains active for existing users. No new users will be directed to install it.
Do not delete this code — keep for reference and potential rollback.

## Files

| File | Status |
|------|--------|
| All files in `chrome-extension/` | Deprecated, kept for reference |
| `ab-tool/public/ab.js` | Now contains picker logic |
