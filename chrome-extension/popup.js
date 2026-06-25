const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const statusEl = document.getElementById('status')

// testId beim Tippen persistieren.
idInput.addEventListener('input', () => {
  chrome.storage.local.set({ testId: idInput.value.trim() })
})

// Gespeicherte testId wiederherstellen.
chrome.storage.local.get(['testId'], (v) => {
  if (v.testId) idInput.value = v.testId
})

function setStatus(msg, cls) {
  statusEl.textContent = msg
  statusEl.className = 'status' + (cls ? ' ' + cls : '')
}

startBtn.addEventListener('click', async () => {
  const testId = idInput.value.trim()

  if (!testId) {
    setStatus('Please enter a testId.', 'err')
    return
  }

  // Vorhandene apiBase/abToken unverändert lassen, nur testId + Start-Flag setzen.
  await chrome.storage.local.set({ testId, ab_manual_start: true })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) {
    setStatus('No active tab found.', 'err')
    return
  }

  try {
    // Fallback für Tabs, die vor der Extension-Installation geöffnet wurden
    // (dort ist das deklarative Content-Script noch nicht aktiv).
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    window.close()
  } catch (e) {
    setStatus('Could not start picker: ' + e.message, 'err')
  }
})
