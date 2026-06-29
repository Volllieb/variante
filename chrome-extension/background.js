// AB Element Picker — Service Worker (Background).
// Hört auf Nachrichten aus content.js und schließt Tabs auf Wunsch.

// Onboarding: bei Erstinstallation eine kurze Welcome-Seite öffnen, die erklärt,
// dass die Extension zum variante-Figma-Plugin gehört und sich dort automatisch öffnet.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch(() => {}) // ponytail: welcome page already open, silent fail
  }
})

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CLOSE_TAB' && sender.tab && sender.tab.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {}) // ponytail: last tab in window, closing impossible
  }

  if (msg.type === 'AUTO_INJECT' && sender.tab && sender.tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['content-picker.js'],
    }).catch(() => {})
  }
})
