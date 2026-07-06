const idInput = document.getElementById('test-id')
const startBtn = document.getElementById('start')
const reselectBtn = document.getElementById('reselect-btn')
const inputMsg = document.getElementById('input-msg')
const viewPick = document.getElementById('view-pick')
const viewDone = document.getElementById('view-done')

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

function showDone() {
  viewPick.classList.add('hidden')
  viewDone.classList.remove('hidden')
}

function showPick() {
  viewDone.classList.add('hidden')
  viewPick.classList.remove('hidden')
}

startBtn.addEventListener('click', async () => {
  const testId = idInput.value.trim()

  if (!testId) { showInputErr('Please enter a testId.'); return }

  await chrome.storage.local.set({ testId })
  saveTestIdHistory(testId)

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || !tab.id) { showInputErr('No active tab found.'); return }

  // Try message first — content-picker.js may already be injected (auto-flow
  // from background.js via ab_pick= URL param). If it is, we reuse it instead
  // of injecting a second copy (which would cause duplicate pickers/overlays).
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER', testId, mode: 'element' })
    if (resp && resp.ok) { window.close(); return }
    showInputErr('Picker did not start.')
  } catch (_) {
    // No listener yet — inject the script, wait for auto-start, then confirm
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-picker.js'],
      })
      // Auto-start in content-picker.js uses chrome.storage.local.get (async).
      // Give it a tick, then verify the picker started via message.
      await new Promise(r => setTimeout(r, 120))
      const resp = await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER', testId, mode: 'element' })
      if (resp && resp.ok) window.close()
      else showInputErr('Picker did not start.')
    } catch (e2) {
      showInputErr('Open a web page first, then try again.')
    }
  }
})

// Reselect: neuen testId-Input erlauben
reselectBtn.addEventListener('click', () => {
  showPick()
  idInput.focus()
})
