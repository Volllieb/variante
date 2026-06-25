// AB Element Picker — Content Script.
// Runs persistently via manifest content_scripts on http/https pages.
// Activates the picker on #ab_pick=<testId> (auto-flow from Figma plugin)
// or via START_PICKER message from the popup.
// Hover-highlight + click capture: selector, outerHTML, filtered CSS,
// framework, goal_candidates.

// --- Hash-Snapshot SOFORT sichern (bevor SPA-Router ihn frisst) ---
const __abHashSnapshot = (function () {
  const src = location.hash + '&' + location.search
  const mPick = src.match(/[#?&]ab_pick=([^&]+)/)
  const mGoal = src.match(/[#?&]ab_goal=([^&]+)/)
  const m = mPick || mGoal
  if (!m) return null
  const am = src.match(/[#?&]ab_api=([^&]+)/)
  const tm = src.match(/[#?&]ab_token=([^&]+)/)
  return {
    testId: decodeURIComponent(m[1]),
    apiBase: am ? decodeURIComponent(am[1]) : '',
    token: tm ? decodeURIComponent(tm[1]) : '',
    mode: mGoal ? 'goal' : 'element',
  }
})()

;(function () {
  const DEFAULT_API = 'https://www.getvariante.com'

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
      if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\s+/)
          .filter(c => c && !c.includes(':') && !c.includes('/') && c.length > 1)
          .slice(0, 2)
        if (cls.length) part += '.' + cls.map(c => CSS.escape(c)).join('.')
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
    if (links.includes('tailwind') || /class="[^"]*\b(flex|grid|px-\d|py-\d|text-\w+-\d{3})\b/.test(html)) return 'tailwind'
    if (links.includes('bootstrap') || /class="[^"]*\b(container|row|col-|btn-)\b/.test(html)) return 'bootstrap'
    return 'custom'
  }

  // --- Relevantes CSS sammeln (Zielelement + :root + Pseudo-Zustände) --------
  const PSEUDO_RE = /:(hover|focus|active|focus-visible|focus-within)\b/

  function matchesPseudo(el, sel) {
    const base = sel.replace(/:(hover|focus|active|focus-visible|focus-within)\b/g, '').trim()
    if (!base) return false
    try { return el.matches(base) } catch (_) { return false }
  }

  function computedBlock(el) {
    try {
      const cs = getComputedStyle(el)
      const props = [
        'color', 'background-color', 'background-image', 'background-size',
        'background-position', 'background-repeat', 'border', 'border-radius',
        'padding', 'margin', 'width', 'height', 'font-family', 'font-size',
        'font-weight', 'line-height', 'letter-spacing', 'text-align',
        'text-transform', 'text-decoration', 'white-space', 'display',
        'flex-direction', 'align-items', 'justify-content', 'gap', 'object-fit',
        'box-shadow', 'transition', 'transform', 'transform-origin', 'animation',
        'backdrop-filter', 'cursor', 'opacity',
      ]
      const lines = props
        .map((p) => '  ' + p + ': ' + cs.getPropertyValue(p) + ';')
        .filter((l) => l.indexOf(': ;') === -1 && l.indexOf(': none;') === -1 && l.indexOf(': normal;') === -1)
      if (!lines.length) return ''
      return '/* computed styles of original element (reference) */\n.__original {\n' + lines.join('\n') + '\n}'
    } catch (_) { return '' }
  }

  function collectCss(el) {
    const out = []
    const seen = new Set()
    function push(rule) { if (!seen.has(rule.cssText)) { seen.add(rule.cssText); out.push(rule.cssText) } }
    function consider(rule) {
      try {
        const sel = rule.selectorText
        if (!sel) return
        if (sel.includes(':root') || rule.cssText.includes('--')) { push(rule); return }
        if (PSEUDO_RE.test(sel)) { if (matchesPseudo(el, sel)) push(rule); return }
        if (el.matches(sel)) push(rule)
      } catch (_) {}
    }
    for (const sheet of Array.from(document.styleSheets)) {
      let rules
      try { rules = sheet.cssRules } catch (_) { continue }
      if (!rules) continue
      for (const rule of Array.from(rules)) {
        if (rule.type === CSSRule.STYLE_RULE) consider(rule)
        else if (rule.cssRules) { for (const sub of Array.from(rule.cssRules)) { if (sub.type === CSSRule.STYLE_RULE) consider(sub) } }
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
      const text = (el.innerText || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      out.push({ selector: sel, text })
    }
    add(picked)
    const nodes = document.querySelectorAll('button, a[href], [role="button"], input[type="submit"], input[type="button"]')
    for (let i = 0; i < nodes.length && out.length < 15; i++) add(nodes[i])
    return out.slice(0, 15)
  }

  // --- Persistentes Banner (visible header, kein Toast) --------------------
  var __abBanner = null

  function showBanner(msg) {
    hideBanner()
    var b = document.createElement('div')
    b.id = '__ab_banner'
    b.textContent = msg || 'Click element (ESC cancels).'
    b.style.cssText =
      'position:fixed;z-index:2147483647;top:0;left:0;right:0;' +
      'padding:10px 40px;font:700 14px -apple-system,Segoe UI,sans-serif;color:#fff;' +
      'text-align:center;background:#2563eb;box-shadow:0 2px 12px rgba(0,0,0,.3);' +
      'letter-spacing:.3px;user-select:none;'
    // Close button (X) on the right
    var closeBtn = document.createElement('span')
    closeBtn.textContent = '\u2716'
    closeBtn.style.cssText =
      'position:absolute;right:12px;top:50%;transform:translateY(-50%);' +
      'cursor:pointer;font-size:16px;opacity:.7'
    closeBtn.onclick = function (e) { e.stopPropagation(); hideBanner() }
    b.appendChild(closeBtn)
    // Klick auf Banner → cleanup + ESC
    b.onclick = function () { if (window.__abCleanup) window.__abCleanup(); hideBanner() }
    document.body.appendChild(b)
    __abBanner = b
  }

  function hideBanner() {
    if (__abBanner) { try { __abBanner.remove() } catch (_) {}; __abBanner = null }
  }

  // --- Erfolgs-Overlay mit "Tab schließen" -----------------------------------
  function overlay(msg, ok) {
    hideBanner()
    var wrap = document.createElement('div')
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);font-family:-apple-system,Segoe UI,sans-serif'
    var card = document.createElement('div')
    card.style.cssText = 'background:#fff;color:#111;padding:24px 28px;border-radius:14px;text-align:center;max-width:360px;box-shadow:0 12px 40px rgba(0,0,0,.3)'
    if (ok) {
      card.innerHTML =
        '<div style="font-size:40px;margin-bottom:10px">\u2705</div>' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:4px">' + msg + ' \u2713</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:16px">The tab will close. You\u2019ll land back in Figma automatically.</div>' +
        '<button id="__ab_close_btn" style="display:block;width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px">Close tab \u2192 back to Figma</button>' +
        '<div style="font-size:11px;color:#999">Click anywhere to dismiss.</div>'
      setTimeout(function () {
        var btn = document.getElementById('__ab_close_btn')
        if (btn) {
          btn.onclick = function () {
            btn.textContent = 'Closing tab...'
            btn.style.background = '#16a34a'
            btn.disabled = true
            try { chrome.runtime.sendMessage({ type: 'CLOSE_TAB' }) } catch (_) {}
            try { window.close() } catch (_) {}
          }
        }
      }, 50)
    } else {
      card.innerHTML = '<div style="font-size:34px;margin-bottom:8px">\u26A0\uFE0F</div><div style="font-size:15px;font-weight:700;margin-bottom:6px">' + msg + '</div>'
    }
    wrap.appendChild(card)
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove() })
    document.body.appendChild(wrap)
    if (!ok) setTimeout(function () { wrap.remove() }, 3500)
  }

  // --- Picker starten --------------------------------------------------------
  function startPicker(mode) {
    if (window.__abPickerActive) return
    window.__abPickerActive = true

    // Warten bis DOM bereit ist für Banner (document_start läuft vor <body>).
    function boot() {
      if (!document.body) { setTimeout(boot, 50); return }
      showBanner(mode === 'goal' ? 'Click goal element (ESC cancels).' : 'Click element (ESC cancels).')

      var lastEl = null
      var HL = '2px solid #2563eb'

      function onOver(e) { if (lastEl) lastEl.style.outline = ''; lastEl = e.target; lastEl.style.outline = HL }
      function onOut(e) { if (e.target && e.target.style) e.target.style.outline = '' }

      async function onClick(e) {
        e.preventDefault()
        e.stopPropagation()
        var el = e.target
        cleanup()
        hideBanner()

        var cfg
        try { cfg = await chrome.storage.local.get(['apiBase', 'testId', 'abToken']) } catch (_) { cfg = {} }
        var apiBase = (cfg.apiBase || DEFAULT_API).replace(/\/+$/, '')
        var testId = cfg.testId
        if (!testId) { overlay('testId missing.', false); return }

        var headers = { 'Content-Type': 'application/json' }
        if (cfg.abToken) headers['Authorization'] = 'Bearer ' + cfg.abToken

        try {
          var res
          if (mode === 'goal') {
            res = await fetch(apiBase + '/api/tests/' + testId, {
              method: 'PATCH', headers: headers,
              body: JSON.stringify({ goal: cssSelector(el) }),
            })
          } else {
            res = await fetch(apiBase + '/api/capture', {
              method: 'POST', headers: headers,
              body: JSON.stringify({
                testId: testId,
                selector: cssSelector(el),
                original_html: el.outerHTML,
                site_css: collectCss(el),
                framework: detectFramework(),
                goal_candidates: collectGoalCandidates(el),
              }),
            })
          }
          if (res.ok) { overlay(mode === 'goal' ? 'Goal saved' : 'Element saved', true) }
          else { overlay('Save failed (' + res.status + ')', false) }
        } catch (err) { overlay('Network error while saving.', false) }
      }

      function onKey(e) {
        if (e.key === 'Escape') { cleanup(); hideBanner() }
      }

      function cleanup() {
        if (lastEl) lastEl.style.outline = ''
        document.removeEventListener('mouseover', onOver, true)
        document.removeEventListener('mouseout', onOut, true)
        document.removeEventListener('click', onClick, true)
        document.removeEventListener('keydown', onKey, true)
        window.__abPickerActive = false
        window.__abCleanup = null
      }

      window.__abCleanup = cleanup
      document.addEventListener('mouseover', onOver, true)
      document.addEventListener('mouseout', onOut, true)
      document.addEventListener('click', onClick, true)
      document.addEventListener('keydown', onKey, true)
    }

    boot()
  }

  // --- Auto-Start aus Hash-Snapshot (vor SPA gerettet) -----------------------
  if (__abHashSnapshot && __abHashSnapshot.testId) {
    try {
      var patch = { testId: __abHashSnapshot.testId }
      if (__abHashSnapshot.apiBase) patch.apiBase = __abHashSnapshot.apiBase
      if (__abHashSnapshot.token) patch.abToken = __abHashSnapshot.token
      chrome.storage.local.set(patch)
    } catch (_) {}
    // KEIN history.replaceState — das kills den Hash für SPAs. Der Banner
    // zeigt an, dass der Picker läuft. Ein Reload startet nicht erneut weil
    // __abPickerActive dann true ist.
    startPicker(__abHashSnapshot.mode)
  }

  // --- Message-basierter Start (Popup → content script) ----------------------
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'START_PICKER') {
      if (!msg.testId) return
      chrome.storage.local.set({ testId: msg.testId }).catch(function () {})
      startPicker(msg.mode || 'element')
      sendResponse({ ok: true })
    }
  })
})()
