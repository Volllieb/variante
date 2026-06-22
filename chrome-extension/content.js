// AB Element Picker — Content Script.
// Läuft persistent (manifest content_scripts) auf http/https-Seiten, aktiviert
// den Picker aber NUR, wenn die Seite mit #ab_pick=<testId> geöffnet wurde
// (Auto-Flow aus dem Figma-Plugin) oder das Popup ihn manuell startet.
// Hover-Highlight + Klick-Capture: selector, outerHTML, gefiltertes CSS,
// framework, goal_candidates.
(function () {
  const DEFAULT_API = 'https://ab-tool-pied.vercel.app'

  // --- CSS-Selektor: möglichst eindeutiger Pfad zum Element ------------------
  function cssSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id)
    const parts = []
    let node = el
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      let part = node.tagName.toLowerCase()
      if (node.id) {
        part = '#' + CSS.escape(node.id)
        parts.unshift(part)
        break
      }
      const parent = node.parentNode
      if (parent) {
        const siblings = Array.prototype.filter.call(
          parent.children,
          (c) => c.tagName === node.tagName
        )
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')'
        }
      }
      parts.unshift(part)
      node = node.parentNode
    }
    return parts.join(' > ')
  }

  // --- Framework-Detection ---------------------------------------------------
  function detectFramework() {
    const html = document.documentElement.outerHTML.slice(0, 50000)
    const links = Array.prototype.map
      .call(document.querySelectorAll('link[href], script[src]'), (n) => n.href || n.src)
      .join(' ')
      .toLowerCase()

    if (links.includes('tailwind') || /class="[^"]*\b(flex|grid|px-\d|py-\d|text-\w+-\d{3})\b/.test(html)) {
      return 'tailwind'
    }
    if (links.includes('bootstrap') || /class="[^"]*\b(container|row|col-|btn-)\b/.test(html)) {
      return 'bootstrap'
    }
    return 'custom'
  }

  // --- Relevantes CSS sammeln (Zielelement + :root + Pseudo-Zustände) --------
  const PSEUDO_RE = /:(hover|focus|active|focus-visible|focus-within)\b/

  function matchesPseudo(el, sel) {
    const base = sel.replace(/:(hover|focus|active|focus-visible|focus-within)\b/g, '').trim()
    if (!base) return false
    try {
      return el.matches(base)
    } catch (_) {
      return false
    }
  }

  function computedBlock(el) {
    try {
      const cs = getComputedStyle(el)
      const props = [
        'color', 'background-color', 'background-image', 'border', 'border-radius',
        'padding', 'margin', 'font-family', 'font-size', 'font-weight', 'line-height',
        'letter-spacing', 'text-align', 'text-transform', 'display', 'box-shadow',
        'transition', 'cursor', 'opacity',
      ]
      const lines = props
        .map((p) => '  ' + p + ': ' + cs.getPropertyValue(p) + ';')
        .filter((l) => l.indexOf(': ;') === -1 && l.indexOf(': none;') === -1 && l.indexOf(': normal;') === -1)
      if (!lines.length) return ''
      return '/* computed styles des Originalelements (Referenz) */\n.__original {\n' + lines.join('\n') + '\n}'
    } catch (_) {
      return ''
    }
  }

  function collectCss(el) {
    const out = []
    const seen = new Set()

    function push(rule) {
      if (!seen.has(rule.cssText)) {
        seen.add(rule.cssText)
        out.push(rule.cssText)
      }
    }

    function consider(rule) {
      try {
        const sel = rule.selectorText
        if (!sel) return
        if (sel.includes(':root') || rule.cssText.includes('--')) {
          push(rule)
          return
        }
        if (PSEUDO_RE.test(sel)) {
          if (matchesPseudo(el, sel)) push(rule)
          return
        }
        if (el.matches(sel)) push(rule)
      } catch (_) {}
    }

    for (const sheet of Array.from(document.styleSheets)) {
      let rules
      try {
        rules = sheet.cssRules
      } catch (_) {
        continue // cross-origin Stylesheet — nicht lesbar
      }
      if (!rules) continue
      for (const rule of Array.from(rules)) {
        if (rule.type === CSSRule.STYLE_RULE) {
          consider(rule)
        } else if (rule.cssRules) {
          for (const sub of Array.from(rule.cssRules)) {
            if (sub.type === CSSRule.STYLE_RULE) consider(sub)
          }
        }
      }
    }

    const rulesText = out.join('\n').slice(0, 18000)
    const computed = computedBlock(el)
    return (computed ? rulesText + '\n\n' + computed : rulesText).slice(0, 24000)
  }

  // --- Goal-Kandidaten: klickbare Elemente fürs Plugin-Dropdown --------------
  function collectGoalCandidates(picked) {
    const out = []
    const seen = new Set()
    function add(el) {
      if (!el || el.nodeType !== 1) return
      const sel = cssSelector(el)
      if (!sel || seen.has(sel)) return
      seen.add(sel)
      const text = (el.innerText || el.textContent || el.value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40)
      out.push({ selector: sel, text })
    }
    add(picked)
    const nodes = document.querySelectorAll(
      'button, a[href], [role="button"], input[type="submit"], input[type="button"]'
    )
    for (let i = 0; i < nodes.length && out.length < 15; i++) add(nodes[i])
    return out.slice(0, 15)
  }

  // --- Erfolgs-Overlay mit "Tab schließen" -----------------------------------
  function overlay(msg, ok) {
    const wrap = document.createElement('div')
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,.45);font-family:-apple-system,Segoe UI,sans-serif'
    const card = document.createElement('div')
    card.style.cssText =
      'background:#fff;color:#111;padding:24px 28px;border-radius:14px;text-align:center;max-width:360px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.3)'
    
    if (ok) {
      // Erfolgs-Overlay: Button schließt den Tab, damit Figma wieder in den Vordergrund kommt.
      card.innerHTML =
        '<div style="font-size:40px;margin-bottom:10px">✅</div>' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:4px">' + msg + ' ✓</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:16px">Der Tab wird geschlossen — du landest automatisch wieder in Figma.</div>' +
        '<button id="__ab_close_btn" style="display:block;width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px">Tab schließen → zurück zu Figma</button>' +
        '<div style="font-size:11px;color:#999">Oder irgendwo hin klicken um das Overlay zu schließen.</div>'
      
      setTimeout(() => {
        const btn = document.getElementById('__ab_close_btn')
        if (btn) {
          btn.onclick = function() {
            btn.textContent = 'Schließe Tab...'
            btn.style.background = '#16a34a'
            btn.disabled = true
            // Versuch 1: background.js bitten den Tab zu schließen
            try { chrome.runtime.sendMessage({ type: 'CLOSE_TAB' }) } catch (_) {}
            // Versuch 2: direkt window.close (funktioniert bei per JS geöffneten Tabs)
            try { window.close() } catch (_) {}
          }
        }
      }, 50)
    } else {
      card.innerHTML =
        '<div style="font-size:34px;margin-bottom:8px">⚠️</div>' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:6px">' + msg + '</div>'
    }
    
    wrap.appendChild(card)
    wrap.addEventListener('click', function(e) { if (e.target === wrap) wrap.remove() })
    document.body.appendChild(wrap)
    if (!ok) setTimeout(function() { wrap.remove() }, 3500)
  }

  // --- Picker starten --------------------------------------------------------
  // mode: 'element' = volle Erfassung (POST /api/capture)
  //       'goal'    = nur Selektor als Conversion-Ziel (PATCH /api/tests/:id)
  function startPicker(mode) {
    if (window.__abPickerActive) return
    window.__abPickerActive = true

    let lastEl = null
    const HL = '2px solid #2563eb'

    function toast(msg, ok) {
      const t = document.createElement('div')
      t.textContent = msg
      t.style.cssText =
        'position:fixed;z-index:2147483647;top:16px;left:50%;transform:translateX(-50%);' +
        'padding:10px 16px;border-radius:8px;font:600 13px sans-serif;color:#fff;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.25);background:' +
        (ok ? '#16a34a' : '#dc2626')
      document.body.appendChild(t)
      setTimeout(function() { t.remove() }, 3000)
    }

    function onOver(e) {
      if (lastEl) lastEl.style.outline = ''
      lastEl = e.target
      lastEl.style.outline = HL
    }
    function onOut(e) {
      if (e.target.style) e.target.style.outline = ''
    }

    async function onClick(e) {
      e.preventDefault()
      e.stopPropagation()
      const el = e.target

      cleanup()

      let cfg
      try {
        cfg = await chrome.storage.local.get(['apiBase', 'testId'])
      } catch (_) {
        cfg = {}
      }
      const apiBase = (cfg.apiBase || DEFAULT_API).replace(/\/+$/, '')
      const testId = cfg.testId
      if (!testId) {
        overlay('testId fehlt — über das Figma-Plugin öffnen.', false)
        return
      }

      try {
        let res
        if (mode === 'goal') {
          // Metrik-Modus: nur den Selektor als Conversion-Ziel speichern.
          res = await fetch(apiBase + '/api/tests/' + testId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: cssSelector(el) }),
          })
        } else {
          // Element-Modus: volle Erfassung des Test-Elements.
          res = await fetch(apiBase + '/api/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testId,
              selector: cssSelector(el),
              original_html: el.outerHTML,
              site_css: collectCss(el),
              framework: detectFramework(),
              goal_candidates: collectGoalCandidates(el),
            }),
          })
        }
        if (res.ok) {
          overlay(mode === 'goal' ? 'Conversion-Ziel gespeichert' : 'Element gespeichert', true)
        } else {
          overlay('Speichern fehlgeschlagen (' + res.status + ')', false)
        }
      } catch (err) {
        overlay('Netzwerkfehler beim Speichern.', false)
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        cleanup()
        toast('Auswahl abgebrochen.', false)
      }
    }

    function cleanup() {
      if (lastEl) lastEl.style.outline = ''
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('mouseout', onOut, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
      window.__abPickerActive = false
    }

    // Capture-Phase, damit wir vor Seiten-Handlern abfangen.
    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('mouseout', onOut, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)

    toast(
      (mode === 'goal' ? 'Conversion-Ziel anklicken' : 'Element anklicken') + ' (ESC bricht ab).',
      true
    )
  }

  // --- Auto-Start ------------------------------------------------------------
  // Trigger aus der URL lesen:
  //   #ab_pick=<testId> = Element-Modus, #ab_goal=<testId> = Metrik-Modus
  //   (optional &ab_api=<url>).
  function getTrigger() {
    const src = location.hash + '&' + location.search
    const mPick = src.match(/[#?&]ab_pick=([^&]+)/)
    const mGoal = src.match(/[#?&]ab_goal=([^&]+)/)
    const m = mPick || mGoal
    if (!m) return null
    const am = src.match(/[#?&]ab_api=([^&]+)/)
    return {
      testId: decodeURIComponent(m[1]),
      apiBase: am ? decodeURIComponent(am[1]) : '',
      mode: mGoal ? 'goal' : 'element',
    }
  }

  const trig = getTrigger()
  if (trig && trig.testId) {
    try {
      chrome.storage.local.set({ testId: trig.testId, apiBase: trig.apiBase || DEFAULT_API })
    } catch (_) {}
    // Trigger aus der URL entfernen, damit ein Reload den Picker nicht erneut startet.
    try {
      history.replaceState(null, '', location.pathname + location.search)
    } catch (_) {}
    startPicker(trig.mode)
  } else {
    // Manueller Start über das Popup (Einmal-Flag, immer Element-Modus).
    try {
      chrome.storage.local.get(['ab_manual_start'], function(v) {
        if (v && v.ab_manual_start) {
          chrome.storage.local.remove('ab_manual_start')
          startPicker('element')
        }
      })
    } catch (_) {}
  }
})()
