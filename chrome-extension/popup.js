const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const statusEl = document.getElementById('status')

// testId-History (letzte 10) in chrome.storage pflegen.
function saveTestIdHistory(value) {
  if (!value) return
  chrome.storage.local.get(['testIdHistory'], (v) => {
    let arr = v.testIdHistory || []
    arr = [value, ...arr.filter(x => x !== value)].slice(0, 10)
    chrome.storage.local.set({ testIdHistory: arr }, () => {
      populateTestIdDatalist(arr)
    })
  })
}
function populateTestIdDatalist(arr) {
  const dl = document.getElementById('dl-testid')
  if (!dl) return
  dl.innerHTML = ''
  arr.forEach(v => {
    const o = document.createElement('option')
    o.value = v
    dl.appendChild(o)
  })
}

// testId beim Tippen persistieren.
idInput.addEventListener('input', () => {
  const val = idInput.value.trim()
  chrome.storage.local.set({ testId: val })
})

// Gespeicherte testId + History wiederherstellen.
chrome.storage.local.get(['testId', 'testIdHistory'], (v) => {
  if (v.testId) idInput.value = v.testId
  if (v.testIdHistory) populateTestIdDatalist(v.testIdHistory)
})

function setStatus(msg, cls) {
  statusEl.textContent = msg
  statusEl.className = 'status' + (cls ? ' ' + cls : '')
}

startBtn.addEventListener('click', async () => {
  const testId = idInput.value.trim()

  if (!testId) { setStatus('Please enter a testId.', 'err'); return }

  await chrome.storage.local.set({ testId })
  saveTestIdHistory(testId)

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
