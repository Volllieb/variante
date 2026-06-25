const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const statusEl = document.getElementById('status')

// testId beim Tippen persistieren.
idInput.addEventListener('input', () => chrome.storage.local.set({ testId: idInput.value.trim() }))

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

  if (!testId) { setStatus('Please enter a testId.', 'err'); return }

  await chrome.storage.local.set({ testId })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) { setStatus('No active tab found.', 'err'); return }

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER', testId, mode: 'element' })
    if (resp && resp.ok) window.close()
    else setStatus('Picker did not start.', 'err')
  } catch (e) {
    setStatus('Open a web page first, then try again.', 'err')
  }
})
