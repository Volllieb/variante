// AB Element Picker — Service Worker (Background).
// Kein content_scripts im Manifest — alles on-demand via scripting API.
// Auto-Flow: onUpdated fängt ab_pick=/ab_goal= aus der URL,
// speichert Payload in storage.local und injectet content-picker.js.

const __abInjectedTabs = new Set() // ponytail: survives only while SW lives; a restart means fresh injection anyway

// Onboarding: bei Erstinstallation eine kurze Welcome-Seite öffnen
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch(() => {})
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') return
  if (!tab.url || __abInjectedTabs.has(tabId)) return

  const parsed = parseAbParams(tab.url)
  if (!parsed) return

  __abInjectedTabs.add(tabId)

  // Store so content-picker.js (injected below) picks it up
  const patch = { testId: parsed.testId, abPickerMode: parsed.mode }
  if (parsed.apiBase) patch.apiBase = parsed.apiBase
  if (parsed.token) patch.abToken = parsed.token
  chrome.storage.local.set(patch).catch(() => {})

  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-picker.js'],
  }).catch(() => {})
})

function parseAbParams(url) {
  // Extract everything after the protocol+host, including hash and query
  const path = url.replace(/^[^:]*:\/\/[^\/]+/, '')
  const src = (path.match(/[#?].*/) || [''])[0]
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
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CLOSE_TAB' && sender.tab && sender.tab.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {}) // ponytail: last tab in window, closing impossible
  }
})
