// AB Element Picker — Service Worker (Background).
// Hört auf Nachrichten aus content.js und schließt Tabs auf Wunsch.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CLOSE_TAB' && sender.tab && sender.tab.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {
      // Fallback: Tab konnte nicht geschlossen werden (z.B. letzter Tab im Fenster)
    })
  }
})
