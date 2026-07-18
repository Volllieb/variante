// variante — Figma Plugin (Stats-Only Edition)
// Zeigt Test-Statistiken an und verlinkt zum Dashboard für neue Tests.

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

    case 'LOAD_STATS': {
      const token = (await figma.clientStorage.getAsync('ab_token')) as string || ''
      try {
        const res = await fetch('https://tryvariante.com/api/figma/stats', {
          headers: { Authorization: 'Bearer ' + token },
        })
        if (!res.ok) {
          figma.ui.postMessage({
            type: 'STATS_RESULT',
            html: '<div class=\"loader\">No tests found. Create one in the Dashboard.</div>',
          })
          return
        }
        const data = await res.json()
        const tests = Array.isArray(data.tests) ? data.tests : []
        if (tests.length === 0) {
          figma.ui.postMessage({
            type: 'STATS_RESULT',
            html: '<div class=\"loader\">No tests yet — create one in the Dashboard!</div>',
          })
          return
        }
        let html = ''
        for (const t of tests) {
          const convA = t.conversions_a ?? 0
          const convB = t.conversions_b ?? 0
          const winner = convB > convA ? 'B' : convA > convB ? 'A' : '-'
          html += '<div class=\"stat-card\">' +
            '<div style=\"font-size:13px;font-weight:600;margin-bottom:8px\">' + escapeHtml(t.name || 'Test') + '</div>' +
            '<div class=\"stat-row\"><span class=\"stat-lbl\">Status</span><span class=\"stat-val\">' + escapeHtml(t.status || 'draft') + '</span></div>' +
            '<div class=\"stat-row\"><span class=\"stat-lbl\">Visitors</span><span class=\"stat-val\">' + ((t.visitors_a ?? 0) + (t.visitors_b ?? 0)) + '</span></div>' +
            '<div class=\"stat-row\"><span class=\"stat-lbl\">Conv A</span><span class=\"stat-val\">' + convA + '</span></div>' +
            '<div class=\"stat-row\"><span class=\"stat-lbl\">Conv B</span><span class=\"stat-val\">' + convB + '</span></div>' +
            '<div class=\"stat-row\"><span class=\"stat-lbl\">Leader</span><span class=\"stat-val ok\">Variant ' + winner + '</span></div>' +
            '</div>'
        }
        figma.ui.postMessage({ type: 'STATS_RESULT', html })
      } catch {
        figma.ui.postMessage({
          type: 'STATS_RESULT',
          html: '<div class=\"loader\" style=\"color:var(--err,red)\">Failed to load stats.</div>',
        })
      }
      break
    }

    case 'CLOSE':
      figma.closePlugin()
      break
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
