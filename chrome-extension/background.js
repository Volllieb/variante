// AB Element Picker — Service Worker (Background).
// Hört auf Nachrichten aus content.js und schließt Tabs auf Wunsch.

// Onboarding: bei Erstinstallation eine kurze Welcome-Seite öffnen, die erklärt,
// dass die Extension zum variantt-Figma-Plugin gehört und sich dort automatisch öffnet.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch(() => {})
  }
})

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CLOSE_TAB' && sender.tab && sender.tab.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {
      // Fallback: Tab konnte nicht geschlossen werden (z.B. letzter Tab im Fenster)
    })
  }
})
