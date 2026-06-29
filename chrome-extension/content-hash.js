// AB Element Picker — Minimal Hash Capturer.
// Runs persistently on all pages (declared in manifest content_scripts).
// Captures ab_pick/ab_goal from URL hash/query BEFORE SPA routers can consume it,
// stores the payload, and signals the background to inject the full picker.
// THIS is the ONLY script that runs on every page load.

const __abHashSnapshot = (function () {
  const src = location.hash + '&' + location.search
  const mPick = src.match(/[#?&]ab_pick=([^&]+)/)
  const mGoal = src.match(/[#?&]ab_goal=([^&]+)/)
  const m = mPick || mGoal
  if (!m) return null
  const am = src.match(/[#?&]ab_api=([^&]+)/)
  const tm = src.match(/[#?&]ab_token=([^&]+)/)
  return {
    testId: decodeURIComponent(m[1]),
    apiBase: am ? decodeURIComponent(am[1]) : '',
    token: tm ? decodeURIComponent(tm[1]) : '',
    mode: mGoal ? 'goal' : 'element',
  }
})()

if (__abHashSnapshot && __abHashSnapshot.testId) {
  // Store payload for content-picker.js (save API call needs it)
  const patch = { testId: __abHashSnapshot.testId, abPickerMode: __abHashSnapshot.mode }
  if (__abHashSnapshot.apiBase) patch.apiBase = __abHashSnapshot.apiBase
  if (__abHashSnapshot.token) patch.abToken = __abHashSnapshot.token
  try { chrome.storage.local.set(patch) } catch (_) {}

  // Signal background to inject the full picker script
  try { chrome.runtime.sendMessage({ type: 'AUTO_INJECT' }) } catch (_) {}
}
