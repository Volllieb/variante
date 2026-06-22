const apiInput = document.getElementById('api-base')
const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const statusEl = document.getElementById('status')

// Gespeicherte Werte wiederherstellen.
chrome.storage.local.get(['apiBase', 'testId'], (v) => {
  if (v.apiBase) apiInput.value = v.apiBase
  if (v.testId) idInput.value = v.testId
})

function setStatus(msg, cls) {
  statusEl.textContent = msg
  statusEl.className = 'status' + (cls ? ' ' + cls : '')
}

const DEFAULT_API = 'https://ab-tool-pied.vercel.app'

startBtn.addEventListener('click', async () => {
  const apiBase = (apiInput.value.trim() || DEFAULT_API).replace(/\/+$/, '')
  const testId = idInput.value.trim()

  if (!testId) {
    setStatus('Bitte eine testId eingeben.', 'err')
    return
  }

  // Einmal-Flag: content.js startet den Picker beim nächsten Lauf.
  await chrome.storage.local.set({ apiBase, testId, ab_manual_start: true })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) {
    setStatus('Kein aktiver Tab gefunden.', 'err')
    return
  }

  try {
    // Fallback für Tabs, die vor der Extension-Installation geöffnet wurden
    // (dort ist das deklarative Content-Script noch nicht aktiv).
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    window.close()
  } catch (e) {
    setStatus('Konnte Picker nicht starten: ' + e.message, 'err')
  }
})
