const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const inputMsg = document.getElementById('input-msg')
const viewPick = document.getElementById('view-pick')

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
  idInput.classList.remove('err')
  inputMsg.className = 'input-msg'
  inputMsg.textContent = ''
})

// Gespeicherte testId + History wiederherstellen.
chrome.storage.local.get(['testId', 'testIdHistory'], (v) => {
  if (v.testId) idInput.value = v.testId
  if (v.testIdHistory) populateTestIdDatalist(v.testIdHistory)
})

function showInputErr(msg) {
  idInput.classList.add('err')
  inputMsg.className = 'input-msg err'
  inputMsg.textContent = msg
}

startBtn.addEventListener('click', async () => {
  const testId = idInput.value.trim()

  if (!testId) { showInputErr('Please enter a testId.'); return }

  // Persist any token/apiBase from a prior Figma bridge session so the
  // popup-initiated picker also sends an Authorization header.
  let prior = {}
  try { prior = await chrome.storage.local.get(['apiBase','abToken']) } catch (_) {}
  const patch = { testId, abPickerMode: 'element' }
  if (prior.apiBase) patch.apiBase = prior.apiBase
  if (prior.abToken)  patch.abToken  = prior.abToken
  await chrome.storage.local.set(patch)
  saveTestIdHistory(testId)

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) { showInputErr('No active tab found.'); return }

  try {
    // content-picker.js is loaded on-demand to minimize host permissions impact.
    // Double-injection is safe: content-picker.js has a DOM-attribute guard.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-picker.js'],
    })

    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER', testId, mode: 'element' })
    if (resp && resp.ok) window.close()
    else showInputErr('Picker did not start.')
  } catch (e) {
    showInputErr('Open a web page first, then try again.')
  }
})
