// variante — Figma Plugin (Stats-Only Edition)
// Shows your A/B tests read-only and links out to the web dashboard for
// everything else (creating tests, fixing incomplete ones, account settings).
// The UI (ui.html) fetches test data directly from the API — this file only
// bridges the two things a sandboxed plugin UI can't do itself: reading the
// stored token and opening external URLs.

figma.showUI(__html__, { width: 320, height: 360, title: 'variante' })

// API-Token laden und an UI senden
figma.clientStorage.getAsync('ab_token').then((token) => {
  figma.ui.postMessage({ type: 'TOKEN', token: typeof token === 'string' ? token : '' })
})

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'OPEN_URL': {
      if (msg.url) {
        try {
          figma.openExternal(msg.url)
        } catch {
          /* Gesture missing — ignored */
        }
      }
      break
    }

    case 'CLOSE':
      figma.closePlugin()
      break
  }
}
