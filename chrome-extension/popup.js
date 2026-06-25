const idInput = document.getElementById('test-id')
const tokenInput = document.getElementById('ab-token')
const startBtn = document.getElementById('start')
const statusEl = document.getElementById('status')
const helpEl = document.getElementById('token-help')

// Auto-save bei Eingabe.
idInput.addEventListener('input', () => chrome.storage.local.set({ testId: idInput.value.trim() }))
tokenInput.addEventListener('input', () => chrome.storage.local.set({ abToken: tokenInput.value.trim() }))

helpEl.addEventListener('click', () =>
  chrome.tabs.create({ url: 'https://www.getvariante.com/dashboard' })
)

// Gespeicherte Werte wiederherstellen.
chrome.storage.local.get(['testId', 'abToken'], (v) => {
  if (v.testId) idInput.value = v.testId
  if (v.abToken) tokenInput.value = v.abToken
})

function setStatus(msg, cls) {
  statusEl.textContent = msg
  statusEl.className = 'status' + (cls ? ' ' + cls : '')
}

async function startPicker() {
  const testId = idInput.value.trim()
  const abToken = tokenInput.value.trim()

  if (!testId) { setStatus('Please enter a testId.', 'err'); return }
  if (!abToken) { setStatus('Please paste your API token (click "need it?" to find it).', 'err'); return }

  // Speichern + Start-Status.
  await chrome.storage.local.set({ testId, abToken })

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) { setStatus('No active tab found.', 'err'); return }

  try {
    // content.js läuft via manifest content_scripts — Message reicht.
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER', testId, mode: 'element' })
    if (resp && resp.ok) window.close()
    else setStatus('Picker did not start.', 'err')
  } catch (e) {
    setStatus('Open a web page first, then try again.', 'err')
  }
}

startBtn.addEventListener('click', startPicker)
