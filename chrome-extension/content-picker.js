// AB Element Picker — Full Picker (dynamically injected via scripting API).
// NOT declared in manifest content_scripts — injected on-demand only:
//   - Auto-flow: background injects after AUTO_INJECT signal from content-hash.js
//   - Popup flow: popup injects after user clicks "Start"
// Hover-highlight + click capture: selector, outerHTML, filtered CSS,
// framework, goal_candidates.

// Guard against double injection (auto-flow + popup can race).
// Uses a DOM attribute — survives across multiple executeScript calls in the
// same tab, unlike window properties which are per-closure.
if (!document.documentElement.hasAttribute('data-ab-picker-injected')) {
document.documentElement.setAttribute('data-ab-picker-injected', '1')

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
      'padding:12px 40px;font:700 14px -apple-system,Segoe UI,sans-serif;color:#ededed;' +
      'text-align:center;background:#0a0a0a;border-bottom:1px solid rgba(255,255,255,.10);' +
      'box-shadow:0 4px 24px rgba(0,0,0,.6);' +
      'letter-spacing:.3px;user-select:none;'
    var closeBtn = document.createElement('span')
    closeBtn.textContent = '\u2716'
    closeBtn.style.cssText =
      'position:absolute;right:12px;top:50%;transform:translateY(-50%);' +
      'cursor:pointer;font-size:16px;opacity:.7'
    closeBtn.onclick = function (e) { e.stopPropagation(); if (window.__abCleanup) window.__abCleanup(); hideBanner() }
    b.appendChild(closeBtn)
    b.onclick = function () { if (window.__abCleanup) window.__abCleanup(); hideBanner() }
    document.body.appendChild(b)
    __abBanner = b
  }

  function hideBanner() {
    if (__abBanner) { try { __abBanner.remove() } catch (_) {}; __abBanner = null }
  }

  // --- Cleaner Overlay mit "Tab schließen" -----------------------------------
  function overlay(msg, ok) {
    hideBanner()
    if (window.__abCleanup) window.__abCleanup()
    var wrap = document.createElement('div')
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font-family:-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)'
    var card = document.createElement('div')
    card.style.cssText = 'background:#0a0a0a;color:#ededed;padding:32px 36px;border-radius:16px;text-align:center;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.10)'
    if (ok) {
      card.innerHTML =
        '<div style="width:56px;height:56px;border-radius:28px;background:rgba(47,215,108,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:#2fd76c">\u2713</div>' +
        '<div style="font-size:17px;font-weight:700;margin-bottom:4px;line-height:1.4">' + msg + '</div>' +
        '<div style="font-size:13px;color:rgba(237,237,237,.62);margin-bottom:20px;line-height:1.5">Element captured. What\u2019s next?</div>' +
        '<button id="__ab_close_btn" style="display:block;width:100%;padding:12px;border:none;border-radius:10px;background:#ffffff;color:#000000;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .15s;margin-bottom:8px" onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'">Close tab \u2192 back to Figma</button>' +
        '<button id="__ab_reselect_btn" style="display:block;width:100%;padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:transparent;color:#ededed;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.06)\'" onmouseout="this.style.background=\'transparent\'">\u27F3 Reselect element</button>'
      setTimeout(function () {
        var closeBtn = document.getElementById('__ab_close_btn')
        var reselectBtn = document.getElementById('__ab_reselect_btn')
        if (closeBtn) {
          closeBtn.onclick = function () {
            closeBtn.textContent = 'Closing tab...'
            closeBtn.style.background = '#2fd76c'
            closeBtn.style.color = '#000000'
            closeBtn.style.opacity = '1'
            closeBtn.disabled = true
            if (reselectBtn) reselectBtn.style.display = 'none'
            try { chrome.runtime.sendMessage({ type: 'CLOSE_TAB' }) } catch (_) {}
            try { window.close() } catch (_) {}
          }
        }
        if (reselectBtn) {
          reselectBtn.onclick = function () {
            wrap.remove()
            startPicker(window.__abLastMode || 'element')
          }
        }
      }, 50)
    } else {
      card.innerHTML =
        '<div style="width:56px;height:56px;border-radius:28px;background:rgba(245,69,92,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;color:#f5455c">!</div>' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:4px;line-height:1.4;color:#f5455c">' + msg + '</div>' +
        '<div style="font-size:12px;color:rgba(237,237,237,.40);margin-top:14px">Dismissing in a moment\u2026</div>'
    }
    wrap.appendChild(card)
    wrap.addEventListener('click', function (e) { if (e.target === wrap) { wrap.remove() } })
    document.body.appendChild(wrap)
    if (!ok) setTimeout(function () { wrap.remove() }, 3200)
  }

  // --- Picker starten --------------------------------------------------------
  function startPicker(mode) {
    if (window.__abPickerActive) return
    window.__abPickerActive = true
    window.__abLastMode = mode || 'element'

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

  // --- Auto-Start: Vom Service Worker via storage.local + executeScript ----
  chrome.storage.local.get(['testId', 'abPickerMode'], function (cfg) {
    if (cfg.testId && !window.__abPickerLoaded) {
      window.__abPickerLoaded = true
      startPicker(cfg.abPickerMode || 'element')
    }
  })

  // --- Message-basierter Start (Popup → content script) ----------------------
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'START_PICKER') {
      if (!msg.testId) return
      chrome.storage.local.set({ testId: msg.testId }).catch(function () {})
      // startPicker returns early if __abPickerActive — reflect reality, not false hope
      if (window.__abPickerActive) { sendResponse({ ok: true }); return }
      startPicker(msg.mode || 'element')
      sendResponse({ ok: true })
    }
  })
})()

} // close double-injection guard
