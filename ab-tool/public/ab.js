(function () {
  'use strict'

  // ===========================================================================
  // AB Testing — universal client (V2.1)
  // The snippet in <head> is identical on every page and carries NO test data.
  // ab.js resolves which tests apply via the current URL (/api/resolve),
  // assigns variants, and tracks conversions via event delegation.
  // ===========================================================================

  // --- Eigenen Script-Tag finden → API-Origin ableiten ----------------------
  // Lädt mit `async`, daher ist document.currentScript zur Laufzeit oft null.
  var script = document.currentScript
  if (!script || !/\/ab\.js(\?|$)/.test(script.src || '')) {
    var cs = document.querySelectorAll('script[src]')
    for (var i = cs.length - 1; i >= 0; i--) {
      if (/\/ab\.js(\?|$)/.test(cs[i].src)) {
        script = cs[i]
        break
      }
    }
  }
  var origin = ''
  try {
    origin = script && script.src ? new URL(script.src).origin : ''
  } catch (_) {}
  // =========================================================================
  // PICKER MODE — Element & Goal Picker (replaces Chrome Extension)
  // Figma plugin opens https://site.com?ab_pick=<testId>&ab_token=...
  // ab.js detects the params and switches into visual picker mode instead
  // of running the normal A/B flow.
  // =========================================================================

  var __abPickerCfg = (function () {
    try {
      var s = location.search
      if (!s) return null
      var p = new URLSearchParams(s)
      var tid = p.get('ab_pick') || p.get('ab_goal')
      if (!tid) return null
      return {
        testId: tid,
        token: p.get('ab_token') || '',
        apiBase: (p.get('ab_api') || origin || 'https://www.getvariante.com').replace(/\/+$/, ''),
        mode: p.get('ab_goal') ? 'goal' : 'element',
      }
    } catch (_) { return null }
  })()

  if (__abPickerCfg) {
    ;(function startPicker(cfg) {
      if (window.__abPickerActive) return
      window.__abPickerActive = true

      // --- CSS-Selektor: möglichst eindeutiger Pfad zum Element ------------
      function cssSelector(el) {
        if (el.id) return '#' + CSS.escape(el.id)
        var parts = [], node = el
        while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
          var part = node.tagName.toLowerCase()
          if (node.id) { part = '#' + CSS.escape(node.id); parts.unshift(part); break }
          if (node.className && typeof node.className === 'string') {
            var cls = node.className.trim().split(/\s+/).filter(function (c) { return c && c.indexOf(':') === -1 && c.indexOf('/') === -1 && c.length > 1 }).slice(0, 2)
            if (cls.length) part += '.' + cls.map(function (c) { return CSS.escape(c) }).join('.')
          }
          var parent = node.parentNode
          if (parent) {
            var siblings = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === node.tagName })
            if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')'
          }
          parts.unshift(part)
          node = node.parentNode
        }
        return parts.join(' > ')
      }

      // --- Framework-Erkennung --------------------------------------------
      function detectFramework() {
        var html = document.documentElement.outerHTML.slice(0, 50000)
        var links = Array.prototype.map.call(document.querySelectorAll('link[href], script[src]'), function (n) { return n.href || n.src }).join(' ').toLowerCase()
        if (links.indexOf('tailwind') > -1 || /class="[^"]*\b(flex|grid|px-\d|py-\d|text-\w+-\d{3})\b/.test(html)) return 'tailwind'
        if (links.indexOf('bootstrap') > -1 || /class="[^"]*\b(container|row|col-|btn-)\b/.test(html)) return 'bootstrap'
        return 'custom'
      }

      // --- Relevantes CSS (Zielelement + :root + Pseudo-Klassen) ----------
      var PSEUDO_RE = /:(hover|focus|active|focus-visible|focus-within)\b/
      function matchesPseudo(el, sel) {
        var base = sel.replace(/:(hover|focus|active|focus-visible|focus-within)\b/g, '').trim()
        if (!base) return false
        try { return el.matches(base) } catch (_) { return false }
      }
      function computedBlock(el) {
        try {
          var cs = getComputedStyle(el)
          var props = ['color','background-color','background-image','background-size','background-position','background-repeat','border','border-radius','padding','margin','width','height','font-family','font-size','font-weight','line-height','letter-spacing','text-align','text-transform','text-decoration','white-space','display','flex-direction','align-items','justify-content','gap','object-fit','box-shadow','transition','transform','transform-origin','animation','backdrop-filter','cursor','opacity']
          var lines = []
          for (var i = 0; i < props.length; i++) {
            var v = cs.getPropertyValue(props[i])
            if (v && v !== 'none' && v !== 'normal') lines.push('  ' + props[i] + ': ' + v + ';')
          }
          if (!lines.length) return ''
          return '/* computed styles of original element (reference) */\n.__original {\n' + lines.join('\n') + '\n}'
        } catch (_) { return '' }
      }
      function collectCss(el) {
        var out = [], seen = {}
        function push(rule) { if (!seen[rule.cssText]) { seen[rule.cssText] = true; out.push(rule.cssText) } }
        function consider(rule) {
          try {
            var sel = rule.selectorText; if (!sel) return
            if (sel.indexOf(':root') > -1 || rule.cssText.indexOf('--') > -1) { push(rule); return }
            if (PSEUDO_RE.test(sel)) { if (matchesPseudo(el, sel)) push(rule); return }
            if (el.matches(sel)) push(rule)
          } catch (_) {}
        }
        try {
          var sheets = document.styleSheets
          for (var i = 0; i < sheets.length; i++) {
            var rules; try { rules = sheets[i].cssRules } catch (_) { continue }
            if (!rules) continue
            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j]
              if (rule.type === CSSRule.STYLE_RULE) consider(rule)
              else if (rule.cssRules) { for (var k = 0; k < rule.cssRules.length; k++) { if (rule.cssRules[k].type === CSSRule.STYLE_RULE) consider(rule.cssRules[k]) } }
            }
          }
        } catch (_) {}
        var rulesText = out.join('\n').slice(0, 18000)
        var comp = computedBlock(el)
        return (comp ? rulesText + '\n\n' + comp : rulesText).slice(0, 24000)
      }

      // --- Goal-Kandidaten: klickbare Elemente fürs Plugin-Dropdown --------
      function collectGoalCandidates(picked) {
        var out = [], seen = {}
        function add(el) {
          if (!el || el.nodeType !== 1) return
          var sel = cssSelector(el); if (!sel || seen[sel]) return
          seen[sel] = true
          var text = (el.innerText || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40)
          out.push({ selector: sel, text: text })
        }
        add(picked)
        var nodes = document.querySelectorAll('button, a[href], [role="button"], input[type="submit"], input[type="button"]')
        for (var i = 0; i < nodes.length && out.length < 15; i++) add(nodes[i])
        return out.slice(0, 15)
      }

      // --- UI: Banner + Overlay -------------------------------------------
      var __banner = null, __pickerCleanup = null
      function showBanner(msg) {
        hideBanner()
        var b = document.createElement('div')
        b.id = '__ab_banner'
        b.textContent = msg || 'Click element (ESC cancels).'
        b.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;right:0;padding:12px 40px;font:700 14px -apple-system,Segoe UI,sans-serif;color:#ededed;text-align:center;background:#0a0a0a;border-bottom:1px solid rgba(255,255,255,.10);box-shadow:0 4px 24px rgba(0,0,0,.6);letter-spacing:.3px;user-select:none'
        var closeBtn = document.createElement('span')
        closeBtn.textContent = '\u2716'
        closeBtn.style.cssText = 'position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:16px;opacity:.7'
        closeBtn.onclick = function (e) { e.stopPropagation(); if (__pickerCleanup) __pickerCleanup(); hideBanner() }
        b.appendChild(closeBtn)
        b.onclick = function () { if (__pickerCleanup) __pickerCleanup(); hideBanner() }
        document.body.appendChild(b)
        __banner = b
      }
      function hideBanner() { if (__banner) { try { __banner.remove() } catch (_) {}; __banner = null } }

      function showOverlay(title, selectorText, isError) {
        hideBanner()
        var old = document.getElementById('__ab_picker_overlay')
        if (old) old.remove()

        var wrap = document.createElement('div')
        wrap.id = '__ab_picker_overlay'
        wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-family:-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:__abFadeIn .2s ease-out'

        var card = document.createElement('div')
        card.style.cssText = 'background:#0a0a0a;color:#ededed;padding:32px 32px 24px;border-radius:16px;max-width:380px;width:calc(100vw - 48px);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08);text-align:center'

        if (isError) {
          card.innerHTML =
            '<div style=\"width:56px;height:56px;border-radius:28px;background:rgba(245,69,92,.10);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;color:#f5455c;border:1px solid rgba(245,69,92,.20)\">!</div>' +
            '<div style=\"font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.4;color:#f5455c\">' + title + '</div>' +
            '<div style=\"font-size:12px;color:rgba(237,237,237,.35);margin-bottom:20px\">Dismissing in a moment\u2026</div>' +
            '<button id=\"__ab_overlay_close\" style=\"display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#ededed;font:600 12px -apple-system,Segoe UI,sans-serif;cursor:pointer;transition:background .15s\" onmouseover=\"this.style.background=\'rgba(255,255,255,.10)\'\" onmouseout=\"this.style.background=\'rgba(255,255,255,.06)\'\" onclick=\"(function(e){e.stopPropagation();var o=document.getElementById(\'__ab_picker_overlay\');if(o)o.remove()})(event)\">Close</button>'
        } else {
          var selDisplay = selectorText
            ? '<div style=\"display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(13,153,255,.08);border:1px solid rgba(13,153,255,.18);border-radius:8px;font:500 12px \'SF Mono\',\'Fira Code\',monospace;color:#0D99FF;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 auto 18px\">' + selectorText + '</div>'
            : ''
          card.innerHTML =
            '<div style=\"width:56px;height:56px;border-radius:28px;background:rgba(20,174,92,.10);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;color:#14AE5C;border:1px solid rgba(20,174,92,.20)\">\u2713</div>' +
            '<div style=\"font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.4;color:#14AE5C\">' + title + '</div>' +
            '<div style=\"font-size:12px;color:rgba(237,237,237,.35);margin-bottom:4px\">Return to Figma to continue</div>' +
            selDisplay +
            '<div style=\"display:flex;gap:8px;justify-content:center;margin-top:20px\">' +
            '<button id=\"__ab_overlay_reselect\" style=\"display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#ededed;font:600 12px -apple-system,Segoe UI,sans-serif;cursor:pointer;transition:background .15s\" onmouseover=\"this.style.background=\'rgba(255,255,255,.10)\'\" onmouseout=\"this.style.background=\'rgba(255,255,255,.06)\'\" onclick=\"(function(e){e.stopPropagation();var o=document.getElementById(\'__ab_picker_overlay\');if(o)o.remove();if(window.__abRekindlePicker)window.__abRekindlePicker()})(event)\">' +
            '\u21BA Reselect</button>' +
            '<button id=\"__ab_overlay_close\" style=\"display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#ededed;font:600 12px -apple-system,Segoe UI,sans-serif;cursor:pointer;transition:background .15s\" onmouseover=\"this.style.background=\'rgba(255,255,255,.10)\'\" onmouseout=\"this.style.background=\'rgba(255,255,255,.06)\'\" onclick=\"(function(e){e.stopPropagation();var o=document.getElementById(\'__ab_picker_overlay\');if(o)o.remove()})(event)\">Close</button>' +
            '</div>'
        }

        wrap.appendChild(card)
        wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove() })

        // Fade-in animation keyframes (inject once)
        if (!document.getElementById('__ab_fadein_style')) {
          var s = document.createElement('style')
          s.id = '__ab_fadein_style'
          s.textContent = '@keyframes __abFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}'
          document.head.appendChild(s)
        }

        document.body.appendChild(wrap)
        if (isError) setTimeout(function () { try { wrap.remove() } catch (_) {} }, 3200)
      }

      // --- Picker starten -------------------------------------------------
      function boot() {
        if (!document.body) { setTimeout(boot, 50); return }
        showBanner(cfg.mode === 'goal' ? 'Click goal element (ESC cancels).' : 'Click element (ESC cancels).')

        var lastEl = null, HL = '2px solid #2563eb'
        function onOver(e) { if (lastEl) lastEl.style.outline = ''; lastEl = e.target; lastEl.style.outline = HL }
        function onOut(e) { if (e.target && e.target.style) e.target.style.outline = '' }

        function onClick(e) {
          e.preventDefault(); e.stopPropagation()
          var el = e.target, sel = cssSelector(el)
          cleanup(); hideBanner()

          var headers = { 'Content-Type': 'application/json' }
          if (cfg.token) headers['Authorization'] = 'Bearer ' + cfg.token

          var url, body
          if (cfg.mode === 'goal') {
            url = cfg.apiBase + '/api/tests/' + cfg.testId
            body = JSON.stringify({ goal: sel })
          } else {
            url = cfg.apiBase + '/api/capture'
            body = JSON.stringify({ testId: cfg.testId, selector: sel, original_html: el.outerHTML, site_css: collectCss(el), framework: detectFramework(), goal_candidates: collectGoalCandidates(el) })
          }
          fetch(url, { method: cfg.mode === 'goal' ? 'PATCH' : 'POST', headers: headers, body: body })
            .then(function (r) {
              if (r.ok) showOverlay(cfg.mode === 'goal' ? 'Goal saved' : 'Element captured', sel, false)
              else showOverlay('Save failed (' + r.status + ')', '', true)
            })
            .catch(function () { showOverlay('Network error while saving.', '', true) })
        }

        function onKey(e) { if (e.key === 'Escape') { cleanup(); hideBanner() } }

        function cleanup() {
          if (lastEl) lastEl.style.outline = ''
          document.removeEventListener('mouseover', onOver, true)
          document.removeEventListener('mouseout', onOut, true)
          document.removeEventListener('click', onClick, true)
          document.removeEventListener('keydown', onKey, true)
          window.__abPickerActive = false
        }
        __pickerCleanup = cleanup

        // Reselect: overlay calls this to re-activate the picker
        window.__abRekindlePicker = function () {
          document.addEventListener('mouseover', onOver, true)
          document.addEventListener('mouseout', onOut, true)
          document.addEventListener('click', onClick, true)
          document.addEventListener('keydown', onKey, true)
          window.__abPickerActive = true
          showBanner(cfg.mode === 'goal' ? 'Click goal element (ESC cancels).' : 'Click element (ESC cancels).')
        }

        document.addEventListener('mouseover', onOver, true)
        document.addEventListener('mouseout', onOut, true)
        document.addEventListener('click', onClick, true)
        document.addEventListener('keydown', onKey, true)
      }

      boot()
    })(__abPickerCfg)

    return // ← picker mode: normalen A/B-Flow NICHT ausführen
  }
  // Anti-Flicker: Klasse auf <html> entfernen (vom Snippet gesetzt). Idempotent.
  function reveal() {
    window.__ab_pending_resolve = true // inline fallback: hör auf zu polln
    try {
      document.documentElement.classList.remove('__ab_pending')
    } catch (_) {}
  }

  if (!origin) {
    reveal()
    return
  }

  // Free-Tier-Badge „A/B by Variante" (vom Server über resolve gesteuert).
  function showBadge() {
    try {
      if (document.getElementById('__ab_badge') || !document.body) return
      var a = document.createElement('a')
      a.id = '__ab_badge'
      a.href = 'https://getvariante.com'
      a.target = '_blank'
      a.rel = 'noopener'
      a.textContent = 'A/B by Variante'
      a.style.cssText =
        'position:fixed;bottom:12px;right:12px;z-index:2147483646;' +
        'background:#111;color:#fff;font:600 11px -apple-system,Segoe UI,sans-serif;' +
        'padding:6px 10px;border-radius:8px;text-decoration:none;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.9'
      document.body.appendChild(a)
    } catch (_) {}
  }

  // --- Hilfsfunktionen -------------------------------------------------------
  function lsGet(k) {
    try {
      return localStorage.getItem(k)
    } catch (_) {
      return null
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v)
    } catch (_) {}
  }

  // fetch mit Timeout (5s). Verhindert, dass ab.js blockiert, wenn der
  // Server nicht antwortet (Cold Start, Netzwerkfehler). Bei Timeout wird
  // die Seite ohne Variante angezeigt (reveal).
  function fetchWithTimeout(url, opts) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    var timer = ctrl ? setTimeout(function () { ctrl.abort() }, 5000) : null
    var fetchOpts = opts || {}
    if (ctrl) fetchOpts.signal = ctrl.signal
    return fetch(url, fetchOpts).then(function (r) {
      if (timer) clearTimeout(timer)
      return r
    }, function (err) {
      if (timer) clearTimeout(timer)
      throw err
    })
  }

  // Goal-Selektor normalisieren: legacy "click:.x" → ".x"; leer → Test-Selektor.
  function normGoal(goal, selector) {
    var g = (goal || '').trim()
    if (g.indexOf('click:') === 0) g = g.slice(6).trim()
    return g || selector
  }

  // --- Conversion-Tracking via Event-Delegation ------------------------------
  // Ein einziger Listener auf document (Capture-Phase). Überlebt den
  // outerHTML-Tausch, weil nicht an ein konkretes Element gebunden.
  var active = [] // [{ key, variant, goalSel }]
  var delegationInstalled = false

  function sendConversion(key, variant) {
    var ck = 'ab_conv_' + key
    try {
      if (sessionStorage.getItem(ck) === '1') return
    } catch (_) {}
    try {
      sessionStorage.setItem(ck, '1')
    } catch (_) {}

    var payload = JSON.stringify({ testId: key, variant: variant, event: 'conversion' })
    try {
      if (navigator.sendBeacon) {
        // WICHTIG: text/plain ist CORS-safelisted → kein Preflight. application/json
        // erzwingt einen Preflight, den sendBeacon nicht kann → Beacon wird cross-origin
        // verworfen. Der Server liest den Body per req.json(), Content-Type egal.
        navigator.sendBeacon(origin + '/api/event', new Blob([payload], { type: 'text/plain' }))
      } else {
        fetch(origin + '/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {})
      }
    } catch (_) {}
  }

  function installDelegation() {
    if (delegationInstalled) return
    delegationInstalled = true
    document.addEventListener(
      'click',
      function (e) {
        for (var i = 0; i < active.length; i++) {
          var a = active[i]
          try {
            if (a.goalSel && e.target && e.target.closest && e.target.closest(a.goalSel)) {
              sendConversion(a.key, a.variant)
            }
          } catch (_) {}
        }
      },
      true
    )
  }

  // --- Variante auf den DOM anwenden -----------------------------------------
  // Markiert die eingefügte B-Wurzel mit data-ab-el="<key>", damit Conversions
  // auch nach dem Element-Tausch zuverlässig zugeordnet werden können. Gibt true
  // zurück, wenn B tatsächlich angewandt wurde.
  function applyDom(selector, variant, html, key) {
    if (variant !== 'B' || !html) return false
    var el = document.querySelector(selector)
    if (!el) return false
    try {
      var tmp = document.createElement('div')
      tmp.innerHTML = html
      var node = tmp.firstElementChild
      if (node) {
        if (key) node.setAttribute('data-ab-el', key)
        el.replaceWith(node)
        return true
      }
      el.outerHTML = html // Fallback: kein Einzel-Wurzelelement im Fragment
      return true
    } catch (_) {
      return false
    }
  }

  // --- Einen Test auflösen + anwenden (gibt ein Promise zurück) --------------
  function applyTest(t) {
    var key = t && t.snippet_key
    var selector = t && t.selector
    if (!key || !selector) return Promise.resolve()
    var goalSel = normGoal(t.goal, selector)

    function finish(variant, html) {
      var applied = applyDom(selector, variant, html, key)
      // Goal-Selektor für Variante B:
      // 1. EXPLIZITES Goal (t.goal gesetzt, z.B. #signup-button) → goalSel behalten.
      //    Das Goal-Element liegt außerhalb des ersetzten Containers, data-ab-el würde
      //    im Elternbaum nie gefunden → 0 Conversions.
      // 2. KEIN separates Goal (goal = Selektorelement) → data-ab-el, weil das
      //    Original-Element durch B-HTML ersetzt wurde und der originale CSS-Selektor
      //    auf dem KI-generierten B-HTML nicht matched.
      // 3. MutationObserver-Race: applyDom schlägt fehl (Element bereits weg beim
      //    zweiten finish-Aufruf), aber data-ab-el steckt noch im DOM vom ersten
      //    Durchlauf → Fallback funktioniert.
      var gsel
      if (variant === 'B' && t.goal) {
        gsel = goalSel          // explizites Goal → originaler Selektor
      } else if (variant === 'B') {
        gsel = '[data-ab-el="' + key + '"]'  // kein separates Goal → data-ab-el
      } else {
        gsel = goalSel
      }
      active.push({ key: key, variant: variant, goalSel: gsel })
    }

    // Abgeschlossener Test mit Gewinner B: ALLE Besucher bekommen B ausgeliefert,
    // ohne Assign-Counter und ohne Conversion-Tracking. HTML kommt aus resolve.
    if (t.force === 'B') {
      if (t.variant_b_html) applyDom(selector, 'B', t.variant_b_html, key)
      return Promise.resolve()
    }

    // Sticky: bereits zugewiesene Variante aus dem Cache (kein erneuter Counter).
    var cached = lsGet('ab_' + key)
    if (cached) {
      try {
        var d = JSON.parse(cached)
        if (d && (d.variant === 'A' || d.variant === 'B')) {
          finish(d.variant, d.html)
          return Promise.resolve()
        }
      } catch (_) {}
    }

    // Erstbesuch: Variante zuweisen lassen. Das B-HTML liegt bereits in der
    // resolve-Antwort (t.variant_b_html) → kein separater /api/variant-Call,
    // weniger Roundtrips = weniger Flicker.
    return fetchWithTimeout(origin + '/api/assign?testId=' + encodeURIComponent(key))
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (res) {
        if (!res || (res.variant !== 'A' && res.variant !== 'B')) return
        if (res.variant === 'A') {
          lsSet('ab_' + key, JSON.stringify({ variant: 'A' }))
          finish('A', null)
          return
        }
        var html = t.variant_b_html
        if (html) {
          lsSet('ab_' + key, JSON.stringify({ variant: 'B', html: html }))
          finish('B', html)
        } else {
          // Noch kein generiertes HTML → assign wurde trotzdem aufgerufen,
          // Besucher ist gezählt. A anzeigen, aber nicht cachen (damit beim
          // nächsten Page-View erneut assign aufgerufen wird und ggf. B-HTML
          // inzwischen existiert).
          finish('A', null)
        }
      })
      .catch(function () {})
  }

  // --- SPA-Support: bei History-Navigation erneut auflösen -------------------
  // Setzt active zurück (alte data-ab-el existieren nicht mehr im neu
  // gerenderten DOM) und führt run() erneut aus.
  function reobserve() {
    active = []
    run()
  }

  // --- Clientseitiges Path-Matching (kein Pfad-Tracking zum Server) ---------
  // Repliziert die server-seitige pathOf/Filter-Logik. DSGVO: Der Server
  // sieht nur den Host, nicht welche Seiten ein Besucher aufruft.
  function pathMatches(testPath, currentPath) {
    // testPath stammt aus site_url und wurde serverseitig via pathOf extrahiert.
    // Leerer testPath = Test gilt für alle Seiten dieser Domain.
    if (!testPath) return true
    return currentPath === testPath || currentPath.indexOf(testPath + '/') === 0
  }

  // --- Hauptlogik ------------------------------------------------------------
  function run() {
    installDelegation()

    // DSGVO: Nur Host senden, nicht den Pfad. Der Server gibt ALLE aktiven
    // Tests für diesen Host zurück. Client filtert per pathMatches().
    var q = '?host=' + encodeURIComponent(location.host)

    fetchWithTimeout(origin + '/api/resolve' + q)
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (res) {
        if (res && res.badge) showBadge()
        var all = res && res.tests ? res.tests : []
        // Clientseitiges Path-Matching — kein Tracking des Surfverhaltens.
        var curPath = location.pathname.replace(/\/+$/, '') || '/'
        var tests = []
        for (var i = 0; i < all.length; i++) {
          if (pathMatches(all[i].path, curPath)) tests.push(all[i])
        }
        if (!tests.length) {
          reveal()
          return
        }
        return Promise.all(tests.map(applyTest)).then(reveal)
      })
      .catch(reveal)
  }

  // --- Initialisierung -------------------------------------------------------
  // Erst nach dem Parsen des DOM anwenden, damit das Zielelement existiert.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }

  // SPA-Support: History-Navigation (popstate) und DOM-Mutationen (für
  // Framework-Router, die das Ziel-Element neu rendern) triggern erneutes
  // Auflösen. Einfaches Reobserve nach jeder Mutation — applyDom ist
  // idempotent (schlägt still fehl, wenn das Element nicht mehr existiert).
  window.addEventListener('popstate', reobserve)
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function () {
      // Nur triggern, wenn active-Tests existieren (sonst kein Grund).
      if (active.length > 0) reobserve()
    })
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true })
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        mo.observe(document.body, { childList: true, subtree: true })
      })
    }
  }
})()
