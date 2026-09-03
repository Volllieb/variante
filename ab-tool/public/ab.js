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
        tempToken: p.get('ab_temp_token') || '',
        apiBase: (p.get('ab_api') || origin || 'https://www.getvariante.com').replace(/\/+$/, ''),
        mode: p.get('ab_goal') ? 'goal' : (p.get('ab_reorder') === '1' ? 'reorder' : 'element'),
      }
    } catch (_) { return null }
  })()

  if (__abPickerCfg) {
    // Picker-Mode: Seite sofort sichtbar machen (Anti-Flicker löst sonst
    // erst nach 10s Safety-Timeout auf, weil der normale A/B-Flow skipped).
    reveal()

    ;(function startPicker(cfg) {
      if (window.__abPickerActive) return
      // Guard gegen Chrome Extension: content-picker.js checkt dieses
      // Attribut und verhindert so doppelte Injektion.
      if (!document.documentElement.hasAttribute('data-ab-picker-injected')) {
        document.documentElement.setAttribute('data-ab-picker-injected', '1')
      }
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
      var COMPUTED_PROPS = ['color','background-color','background-image','background-size','background-position','background-repeat','border','border-width','border-style','border-color','border-radius','padding','margin','width','height','font-family','font-size','font-weight','line-height','letter-spacing','text-align','text-transform','text-decoration','white-space','display','flex-direction','align-items','justify-content','gap','object-fit','box-shadow','transition','transform','transform-origin','animation','backdrop-filter','cursor','opacity']
      // Eine Messung, zwei Ausgaben: computedBlock und computedMap brauchten
      // vorher je einen getComputedStyle-Durchlauf ueber dieselben Properties.
      function computedValues(el) {
        try {
          var cs = getComputedStyle(el)
          var out = {}
          for (var i = 0; i < COMPUTED_PROPS.length; i++) {
            var v = cs.getPropertyValue(COMPUTED_PROPS[i])
            if (v && v !== 'none' && v !== 'normal') out[COMPUTED_PROPS[i]] = v
          }
          return out
        } catch (_) { return {} }
      }
      function computedBlock(el) {
        var vals = computedValues(el)
        var lines = []
        for (var prop in vals) lines.push('  ' + prop + ': ' + vals[prop] + ';')
        if (!lines.length) return ''
        // Der '.__original'-Selektor ist hier ABSICHT: delta.ts parst genau
        // diesen Block beim Draft-Resume (collectedOriginalComputed) und die
        // AI-Kontexte (generatePrompts.ts) nutzen ihn. Die Dashboard-Vorschau
        // bezieht ihre Styles aus styleContext.computed statt aus diesem Text.
        return '/* computed styles of original element (reference) */\n.__original {\n' + lines.join('\n') + '\n}'
      }
      // Gleiche Messung wie computedBlock, aber als Map — Grundlage fuer die
      // Style-Baseline des Delta-Editors im Wizard.
      function computedMap(el) {
        return computedValues(el)
      }
        // Custom Properties muessen mit, sonst greift jedes var() in den
        // Element-Regeln ins Leere. Aber nur DEFINITIONEN (`--x: wert`), nicht
        // jede Regel, die eine Variable bloss BENUTZT: `indexOf('--')` zog
        // vorher `body { background: var(--bg) }` und hunderte fremde Regeln
        // mit herein, sprengte das Budget unten und kaperte die Vorschau.
        var CUSTOM_PROP_DECL_RE = /(^|[;{])\s*--[\w-]+\s*:/
      function collectCss(el) {
        var out = [], seen = {}, len = 0
        function push(rule) {
          if (seen[rule.cssText]) return
          seen[rule.cssText] = true
          out.push(rule.cssText)
          len += rule.cssText.length
        }
        function consider(rule, condPrefix) {
          try {
            var sel = rule.selectorText; if (!sel) return
            if (sel.indexOf(':root') > -1 || CUSTOM_PROP_DECL_RE.test(rule.cssText)) { pushWrapped(rule, condPrefix); return }
            if (PSEUDO_RE.test(sel)) { if (matchesPseudo(el, sel)) pushWrapped(rule, condPrefix); return }
            if (el.matches(sel)) pushWrapped(rule, condPrefix)
          } catch (_) {}
        }
        // Eine Regel aus @media/@supports/@layer behaelt ihren Wrapper: ohne ihn
        // wuerde eine Mobile-only-Regel zu einer unbedingten Regel — das
        // verfaelschte den Figma-Prompt und die Results-Vorschau.
        function pushWrapped(rule, condPrefix) {
          push(condPrefix ? { cssText: condPrefix + ' { ' + rule.cssText + ' }' } : rule)
        }
        function condPrefixOf(rule) {
          try {
            if ((rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) && rule.conditionText) {
              return '@' + (rule.type === CSSRule.MEDIA_RULE ? 'media' : 'supports') + ' ' + rule.conditionText
            }
            if (rule.layerName) return '@layer ' + rule.layerName
          } catch (_) {}
          return null
        }
        try {
          var sheets = document.styleSheets
          for (var i = 0; i < sheets.length && len < 18000; i++) {
            // Skip cross-origin stylesheets — cssRules access throws anyway.
            // location.origin check catches CDN / third-party CSS (fonts, analytics).
            var href = sheets[i].href
            if (href && href.indexOf(location.origin) !== 0 && href.charAt(0) !== '/') continue
            var rules; try { rules = sheets[i].cssRules } catch (_) { continue }
            if (!rules) continue
            for (var j = 0; j < rules.length && len < 18000; j++) {
              var rule = rules[j]
              if (rule.type === CSSRule.STYLE_RULE) consider(rule, null)
              else if (rule.cssRules) {
                var prefix = condPrefixOf(rule)
                for (var k = 0; k < rule.cssRules.length && len < 18000; k++) {
                  if (rule.cssRules[k].type === CSSRule.STYLE_RULE) consider(rule.cssRules[k], prefix)
                }
              }
            }
          }
        } catch (_) {}
        // Auf Regelgrenzen deckeln, nicht auf Zeichen. Ein mitten in einer
        // Deklaration abgeschnittenes `{` laesst die Regel offen, und der
        // CSS-Parser verschluckt dann ALLES danach — in der Vorschau also den
        // computed-Block und das Delta der Variante. Genau das passierte auf
        // vallisride.com: 18000 Zeichen exakt erreicht, letzte Regel halbiert.
        var rulesText = ''
        for (var n = 0; n < out.length; n++) {
          if (rulesText.length + out[n].length + 1 > 18000) break
          rulesText += (rulesText ? '\n' : '') + out[n]
        }
        var comp = computedBlock(el)
        if (!comp) return rulesText
        // Passt beides nicht ins Gesamtbudget, gewinnt der computed-Block: er
        // beschreibt das Element vollstaendig und herkunftsunabhaengig.
        if (rulesText.length + comp.length + 2 > 24000) return comp
        return rulesText + '\n\n' + comp
      }
      // Kontext des Originals fuer den Wizard: relevantes CSS (inkl. @media-
      // Wrapper) + gemessene Computed-Styles.
      function styleContext(el) {
        return { css: collectCss(el), computed: computedMap(el) }
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

      // Detailtexte der Fehler-Card koennen aus der Zielseite stammen (Selektor).
      function esc(v) {
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      }

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
            (selectorText ? '<div style=\"font-size:12px;color:rgba(237,237,237,.55);margin-bottom:10px;line-height:1.5\">' + esc(selectorText) + '</div>' : '') +
            '<div style=\"font-size:12px;color:rgba(237,237,237,.35);margin-bottom:20px\">Dismissing in a moment\u2026</div>' +
            '<button id=\"__ab_overlay_close\" style=\"display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#ededed;font:600 12px -apple-system,Segoe UI,sans-serif;cursor:pointer;transition:background .15s\" onmouseover=\"this.style.background=\'rgba(255,255,255,.10)\'\" onmouseout=\"this.style.background=\'rgba(255,255,255,.06)\'\" onclick=\"(function(e){e.stopPropagation();var o=document.getElementById(\'__ab_picker_overlay\');if(o)o.remove()})(event)\">Close</button>'
        } else {
          var selDisplay = selectorText
            ? '<div style=\"display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(13,153,255,.08);border:1px solid rgba(13,153,255,.18);border-radius:8px;font:500 12px \'SF Mono\',\'Fira Code\',monospace;color:#0D99FF;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 auto 18px\">' + selectorText + '</div>'
            : ''
          card.innerHTML =
            '<div style=\"width:56px;height:56px;border-radius:28px;background:rgba(20,174,92,.10);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;color:#14AE5C;border:1px solid rgba(20,174,92,.20)\">\u2713</div>' +
            '<div style=\"font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.4;color:#14AE5C\">' + title + '</div>' +
            // Ohne Token läuft der Picker aus dem Dashboard-Wizard, nicht aus Figma.
            '<div style=\"font-size:12px;color:rgba(237,237,237,.35);margin-bottom:4px\">' +
            ((cfg.token || cfg.tempToken) ? 'Return to Figma to continue' : 'Return to the dashboard to continue') +
            '</div>' +
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

        var bannerText = cfg.mode === 'goal' ? 'Click goal element (ESC cancels).' :
                        cfg.mode === 'reorder' ? 'Pick first element to swap (ESC cancels).' :
                        'Click element (ESC cancels).'
        showBanner(bannerText)

        var lastEl = null, HL = '2px solid #2563eb', HL2 = '2px solid #f59e0b'
        var reorderEl1 = null, reorderSel1 = null // gespeichert bis zweiter Klick

        function onOver(e) { if (lastEl) lastEl.style.outline = ''; lastEl = e.target; lastEl.style.outline = HL }
        function onOut(e) { if (e.target && e.target.style) e.target.style.outline = '' }

        // Ein 401/403 entsteht hier nur, wenn ein Token MITGESCHICKT und
        // abgelehnt wurde -- ohne Token wird gar nicht erst gesendet. Der nackte
        // Statuscode liess den User raten, was zu tun ist.
        function showSaveError(status) {
          if (status === 401 || status === 403) {
            showOverlay('Token rejected', 'Reconnect the Figma plugin in the dashboard, then start the picker again.', true)
          } else {
            showOverlay('Save failed (' + status + ')', 'The selection was not stored. Please try again in a moment.', true)
          }
        }

        function doCaptureRequest(el, sel, extraBody) {
          var headers = { 'Content-Type': 'application/json' }
          if (cfg.token) headers['Authorization'] = 'Bearer ' + cfg.token
          else if (cfg.tempToken) headers['X-Temp-Token'] = cfg.tempToken

          // Goal-Modus laeuft ueber /api/capture, NICHT ueber PATCH
          // /api/tests/[id]: letztere Route steht hinter einer CORS-Allowlist
          // mit ausschliesslich getvariante.com-Origins, ihr Preflight konnte
          // von einer Kundendomain also nie durchgehen. Der Aufruf endete
          // immer im catch mit "Network error while saving.".
          // /api/capture hat Wildcard-CORS, dieselbe Token-Auth und dieselbe
          // Besitzpruefung — und schreibt bei gesetztem `goal` nur das Goal.
          if (cfg.mode === 'goal') {
            var goalBody = JSON.stringify({ testId: cfg.testId, goal: sel })
            return fetch(cfg.apiBase + '/api/capture', { method: 'POST', headers: headers, body: goalBody })
          }
          var body = JSON.stringify(Object.assign({
            testId: cfg.testId,
            selector: sel,
            original_html: el.outerHTML,
            site_css: collectCss(el),
            framework: detectFramework(),
            goal_candidates: collectGoalCandidates(el),
          }, extraBody || {}))
          return fetch(cfg.apiBase + '/api/capture', { method: 'POST', headers: headers, body: body })
        }

        // PostMessage an öffnendes Dashboard-Fenster (Wizard-Picker-Flow).
        // Dashboard-Komponenten lauschen auf 'ab-pick' / 'ab-goal' messages.
        // Unabhängig vom API-Call — funktioniert auch ohne Auth-Token.
        // Liefert true, wenn die Zustellung geklappt hat.
        function postToOpener(el, sel, text) {
          try {
            if (!window.opener || window.opener.closed) return false
            if (cfg.mode === 'goal') {
              window.opener.postMessage({ type: 'ab-goal', selector: sel, text: text }, '*')
            } else {
              // styleContext: Site-CSS + Computed-Styles — Basis der Wizard-Vorschau
              // und des Delta-Editors. Alte Snippet-Versionen senden weder
              // styleContext noch css; das Dashboard faellt dann auf den
              // Textvergleich zurueck.
              window.opener.postMessage({ type: 'ab-pick', selector: sel, html: el.outerHTML, tagName: el.tagName, text: text, styleContext: styleContext(el) }, '*')
            }
            return true
          } catch (_) { return false }
        }

        // Fallback, wenn window.opener gekappt ist. Das passiert häufiger als
        // erwartet — COOP-Header der Zielseite, Wiederverwendung eines benannten
        // Fensters (window.open setzt opener dabei nicht neu), Privacy-Settings.
        // Bisher verschwand die Auswahl in dem Fall still und der User sah nur
        // "Save failed (401)" bzw. "Network error while saving".
        //
        // /picker-return liegt auf unserer Origin und reicht die Auswahl per
        // localStorage an das offene Dashboard-Tab weiter. Nutzdaten stehen im
        // Fragment, gehen also nie an den Server.
        function returnToDashboard(el, sel, text) {
          function tryNavigate(payload) {
            try {
              location.href = (origin || 'https://www.getvariante.com') +
                '/picker-return#' + encodeURIComponent(JSON.stringify(payload))
              return true
            } catch (_) { return false }
          }
          // Selektor ist das einzige zwingende Feld: PickerReturnClient und
          // usePickerBridge akzeptieren fehlendes html/css/styleContext/text.
          function minimalPayload() {
            return {
              mode: cfg.mode === 'goal' ? 'goal' : 'element',
              selector: sel,
              tagName: el.tagName,
              origin: location.origin,
            }
          }
          try {
            var ctx = cfg.mode === 'goal' ? null : styleContext(el)
            // Das Fragment geht per encodeURIComponent raus, und die blaeht CSS
            // um Faktor 2-3 — ein grosses Stylesheet sprengt sonst die URL-
            // Laenge. Kappung hier, mit Flag: die Vorschau faellt dann auf
            // computed-only zurueck, statt still mit halbem CSS zu rendern.
            var CSS_CAP = 12000
            var cssFull = ctx && ctx.css ? ctx.css : ''
            var payload = {
              mode: cfg.mode === 'goal' ? 'goal' : 'element',
              selector: sel,
              html: cfg.mode === 'goal' ? '' : (el.outerHTML || '').slice(0, 10000),
              // Knapper gedeckelt als beim postMessage-Weg: diese Nutzlast laeuft
              // durch das URL-Fragment.
              css: cfg.mode === 'goal' ? '' : collectCss(el).slice(0, 8000),
              tagName: el.tagName,
              text: text,
              origin: location.origin,
            }
            if (ctx) {
              payload.styleContext = {
                css: cssFull.length > CSS_CAP ? cssFull.slice(0, CSS_CAP) : cssFull,
                computed: ctx.computed || {},
                cssTruncated: cssFull.length > CSS_CAP,
              }
            }
            // Bewusst `origin` (Herkunft des ab.js-Scripts) statt cfg.apiBase:
            // apiBase ist über ?ab_api= steuerbar, und eine Navigation dorthin
            // wäre ein Open-Redirect mit angehängten Auswahldaten.
            if (tryNavigate(payload)) return true
            // Voller Payload nicht kodierbar: encodeURIComponent wirft einen
            // URIError, wenn die Eingabe kaputte UTF-16-Surrogate enthaelt.
            // JSON.stringify escaped solche seit ES2019 zwar selbst, aeltere
            // Engines geben sie aber durch — und jeder andere Wurf beim
            // Encoden darf die Auswahl nicht kosten. Also minimal erneut
            // senden, statt die Auswahl hinter einer falschen Fehlermeldung
            // zu verlieren.
            return tryNavigate(minimalPayload())
          } catch (_) {
            // Selbst wenn schon der AUFBAU des vollen Payloads wirft —
            // styleContext/collectCss sind intern abgesichert, aber jede
            // Kundenseite ist anders — minimal zustellen statt false.
            return tryNavigate(minimalPayload())
          }
        }

        function onClick(e) {
          e.preventDefault(); e.stopPropagation()
          var el = e.target
          // Hover-Rahmen VOR der Erfassung entfernen: onOut feuert beim direkten
          // Klick oft nicht, das outline hinge sonst ueber outerHTML fest in
          // Variante A (blauer Rahmen, der nicht mehr verschwindet).
          if (el.style) el.style.outline = ''
          var sel = cssSelector(el)
          var text = (el.innerText || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 200)
          var sentToOpener = postToOpener(el, sel, text)

          // --- Reorder-Modus: erster Klick → Element A speichern, auf B warten
          if (cfg.mode === 'reorder') {
            if (!reorderEl1) {
              // Erster Klick: Element A markieren
              reorderEl1 = el; reorderSel1 = sel
              if (lastEl) { lastEl.style.outline = ''; lastEl = null }
              reorderEl1.style.outline = '2px solid #f59e0b'
              hideBanner()
              var b = document.createElement('div')
              b.id = '__ab_banner'
              b.innerHTML = '<span style="color:#f59e0b">\u2713</span> First element captured. <span style="opacity:.7">Now click the element to swap with</span> <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:16px;opacity:.7" id="__ab_banner_cancel">\u2716</span>'
              b.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;right:0;padding:12px 40px;font:700 14px -apple-system,Segoe UI,sans-serif;color:#ededed;text-align:center;background:#0a0a0a;border-bottom:1px solid rgba(245,158,11,.3);box-shadow:0 4px 24px rgba(0,0,0,.6);letter-spacing:.3px;user-select:none'
              document.body.appendChild(b)
              __banner = b
              document.getElementById('__ab_banner_cancel').onclick = function (ev) {
                ev.stopPropagation()
                if (reorderEl1) reorderEl1.style.outline = ''
                reorderEl1 = null; reorderSel1 = null
                window.__abRekindlePicker()
              }
              return
            }
            // Zweiter Klick: beide Elemente senden.
            // Element A MUSS vor cleanup() gesichert werden -- cleanup() setzt
            // reorderEl1 selbst auf null. Der Zugriff danach warf jedes Mal
            // "Cannot read properties of null (reading 'outerHTML')", der
            // Swap-Modus brach beim zweiten Klick kommentarlos ab.
            var e1 = reorderEl1
            var s1 = reorderSel1
            // Erst entmarkieren, dann erfassen — das orangene Swap-Highlight
            // hinge sonst im gespeicherten original_html fest.
            e1.style.outline = ''
            var el1Html = e1.outerHTML, el1Css = collectCss(e1)
            cleanup()
            hideBanner()

            // Gleicher Guard wie im Normal-Modus weiter unten: ohne Token kann
            // /api/capture per Definition nur 401 liefern. Der Swap-Modus hat
            // keinen postMessage-Rueckkanal, der Call ist hier also nicht nur
            // nutzlos, sondern die Quelle des irrefuehrenden "Save failed (401)".
            if (!cfg.token && !cfg.tempToken) {
              showOverlay('Swap needs a connected test', 'Start the swap from the dashboard so the picker carries a token.', true)
              return
            }

            var headers = { 'Content-Type': 'application/json' }
            if (cfg.token) headers['Authorization'] = 'Bearer ' + cfg.token
            else if (cfg.tempToken) headers['X-Temp-Token'] = cfg.tempToken
            var body = JSON.stringify({
              testId: cfg.testId,
              selector: s1,
              original_html: el1Html,
              site_css: el1Css,
              framework: detectFramework(),
              goal_candidates: collectGoalCandidates(e1),
              reorder_selector: sel,
              reorder_html: el.outerHTML,
            })
            fetch(cfg.apiBase + '/api/capture', { method: 'POST', headers: headers, body: body })
              .then(function (r) {
                if (r.ok) showOverlay('Swap elements captured', s1 + ' \u2194 ' + sel, false)
                else showSaveError(r.status)
              })
              .catch(function () { showOverlay('Network error while saving.', '', true) })
            return
          }

          // --- Normaler / Goal Modus ---------------------------------------
          cleanup(); hideBanner()

          // Dashboard-Wizard: Der Picker wird ohne Token und ohne echte testId
          // geöffnet (?ab_pick=1) — /api/capture kann dort per Definition nur
          // 401 liefern. Der Call bleibt deshalb ganz weg; die Auswahl läuft
          // ausschliesslich über postMessage bzw. /picker-return.
          if (!cfg.token && !cfg.tempToken) {
            if (sentToOpener) {
              showOverlay(cfg.mode === 'goal' ? 'Goal sent to wizard' : 'Element sent to wizard', sel, false)
            } else if (!returnToDashboard(el, sel, text)) {
              showOverlay('Could not send the selection back', 'Keep the dashboard tab open and start the picker again.', true)
            }
            return
          }

          // Figma-/Plugin-Flow: echter Test + Token → Auswahl serverseitig sichern.
          doCaptureRequest(el, sel).then(function (r) {
            if (r.ok) showOverlay(cfg.mode === 'goal' ? 'Goal saved' : 'Element captured', sel, false)
            else if (sentToOpener) showOverlay(cfg.mode === 'goal' ? 'Goal sent to wizard' : 'Element sent to wizard', sel, false)
            else showSaveError(r.status)
          }).catch(function () {
            if (sentToOpener) showOverlay(cfg.mode === 'goal' ? 'Goal sent to wizard' : 'Element sent to wizard', sel, false)
            else showOverlay('Network error while saving.', '', true)
          })
        }

        function onKey(e) { if (e.key === 'Escape') { cleanup(); hideBanner() } }

        function cleanup() {
          if (lastEl) lastEl.style.outline = ''
          if (reorderEl1) reorderEl1.style.outline = ''
          reorderEl1 = null; reorderSel1 = null
          document.removeEventListener('mouseover', onOver, true)
          document.removeEventListener('mouseout', onOut, true)
          document.removeEventListener('click', onClick, true)
          document.removeEventListener('keydown', onKey, true)
          window.__abPickerActive = false
        }
        __pickerCleanup = cleanup

        // Reselect: overlay calls this to re-activate the picker
        window.__abRekindlePicker = function () {
          reorderEl1 = null; reorderSel1 = null
          document.addEventListener('mouseover', onOver, true)
          document.addEventListener('mouseout', onOut, true)
          document.addEventListener('click', onClick, true)
          document.addEventListener('keydown', onKey, true)
          window.__abPickerActive = true
          showBanner(cfg.mode === 'goal' ? 'Click goal element (ESC cancels).' :
                     cfg.mode === 'reorder' ? 'Pick first element to swap (ESC cancels).' :
                     'Click element (ESC cancels).')
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
      beginApply()
      document.body.appendChild(a)
      endApply()
    } catch (_) {}
  }

  // --- Consent & Storage -----------------------------------------------------
  // Plan LEGAL-01 (TTDSG/DDG §25, DSGVO): ab.js schrieb bisher bedingungslos
  // localStorage['ab_<key>'] und sessionStorage['ab_conv_<key>'] auf jeder
  // Kundenseite — ohne Consent-Prüfung und ohne API für das Consent-Tool des
  // Kunden. Der Kunde ist Verantwortlicher und trägt das Bußgeldrisiko.
  //
  // Zwei Wege für den Kunden, beide über ein globales Flag:
  //   window.varianteConsent = true    → persistentes Storage erlaubt (Opt-in)
  //   window.varianteConsent = false   → cookieless: kein Storage, nur In-Memory
  //
  // Default (Flag nicht gesetzt) ist der rechtssichere COOKIELESS-Modus: die
  // Zuweisung ist innerhalb des Seitenaufrufs stabil (In-Memory), persistiert
  // aber nicht über Reloads. Wer Cross-Visit-Stickiness braucht, holt Consent
  // ein und setzt das Flag. Integration in TCF/Google Consent Mode kann der
  // Kunde über dasselbe Flag verdrahten.
  function hasConsent() {
    try { return window.varianteConsent === true } catch (_) { return false }
  }

  // In-Memory-Fallback für den cookieless Default. Lebt nur für diesen
  // Seitenaufruf — kein Zugriff auf Endeinrichtungen im Sinne des §25 TTDSG.
  var __memStore = {}

  function lsGet(k) {
    if (!hasConsent()) return Object.prototype.hasOwnProperty.call(__memStore, k) ? __memStore[k] : null
    try {
      return localStorage.getItem(k)
    } catch (_) {
      return null
    }
  }
  function lsSet(k, v) {
    if (!hasConsent()) { __memStore[k] = v; return }
    try {
      localStorage.setItem(k, v)
    } catch (_) {}
  }
  // Conversion-Dedup: ohne Consent im In-Memory-Set (reicht, weil eine
  // Conversion ohnehin nur einmal pro Seitenaufruf gesendet werden soll).
  function convGet(k) {
    if (!hasConsent()) return __memStore[k] === '1'
    try { return sessionStorage.getItem(k) === '1' } catch (_) { return false }
  }
  function convSet(k) {
    if (!hasConsent()) { __memStore[k] = '1'; return }
    try { sessionStorage.setItem(k, '1') } catch (_) {}
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
  //
  // "url:/danke" war im Dashboard anwaehlbar, hier aber nie implementiert: der
  // Wert lief ungeprueft als CSS-Selektor in e.target.closest(), der SyntaxError
  // verschwand im catch der Delegation, und der Test zaehlte auf BEIDEN Armen
  // dauerhaft null Conversions — ohne Fehlermeldung, ohne Hinweis im Dashboard.
  // Ein leeres Goal ist ehrlicher als ein kaputtes: die Delegation ueberspringt
  // Eintraege ohne goalSel, und in der Konsole steht, warum nichts gezaehlt wird.
  // Nur das bekannte Praefix wird geprueft — ein generisches "alles vor einem
  // Doppelpunkt" wuerde legitime Pseudoklassen wie "a:hover" mitreissen.
  function normGoal(goal, selector) {
    var g = (goal || '').trim()
    // Praefix-Vergleich case-insensitive: 'Click:…' oder 'URL:…' aus alten
    // Beständen muss genauso erkannt werden wie die kanonische Form.
    var lower = g.toLowerCase()
    if (lower.indexOf('click:') === 0) return g.slice(6).trim() || selector
    if (lower.indexOf('url:') === 0) {
      try {
        console.warn('[variante] URL goals are not supported by the snippet — no conversions are tracked for this test. Pick a click goal in the dashboard.')
      } catch (_) {}
      return ''
    }
    return g || selector
  }

  // --- Conversion-Tracking via Event-Delegation ------------------------------
  // Ein einziger Listener auf document (Capture-Phase). Überlebt den
  // outerHTML-Tausch, weil nicht an ein konkretes Element gebunden.
  var active = [] // [{ key, variant, goalSel }]
  var delegationInstalled = false

  function sendConversion(key, variant) {
    var ck = 'ab_conv_' + key
    if (convGet(ck)) return
    convSet(ck)

    // Plan DATA-01: Token aus dem Assign-Cache mitliefern, damit der Server
    // die Conversion gegen die vorherige Zuweisung verifizieren kann.
    var stored = lsGet('ab_' + key)
    var token = null
    if (stored) {
      try { var data = JSON.parse(stored); token = data.token || null } catch (_) {}
    }
    var payload = JSON.stringify({ testId: key, variant: variant, event: 'conversion', token: token || undefined })
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

  // -- SVG-Sanitization: AI-generated SVGs often have huge pixel dimensions --
  // -- and no viewBox → they blow up the page. Force responsive sizing.    --
  function sanitizeSvgs(parent) {
    var svgs = parent.querySelectorAll('svg')
    for (var s = 0; s < svgs.length; s++) {
      if (!svgs[s].hasAttribute('viewBox')) svgs[s].setAttribute('viewBox', '0 0 ' + (svgs[s].getAttribute('width') || 100) + ' ' + (svgs[s].getAttribute('height') || 100))
      svgs[s].style.maxWidth = '100%'
      svgs[s].style.height = 'auto'
    }
  }

  // -- CSS-Injection: Layout/Reorder-Tests ohne DOM-Mutation.            --
  // -- Kein replaceWith, kein Hydration-Kollateralschaden. Funktioniert  --
  // -- unabhängig vom Element — injected <style> in <head>.              --
  // Guard gegen selbst verursachte Mutationen: applyDom/applyCss veraendern den
  // DOM, was den MutationObserver ausloest, der wieder run() aufruft — eine
  // Endlosschleife aus /api/resolve-Requests (siehe unten, Plan BUG-01).
  var applying = false
  function beginApply() { applying = true }
  function endApply() {
    // Erst im naechsten Task freigeben: MutationObserver-Callbacks laufen als
    // Microtask NACH der Mutation, aber vor einem setTimeout(0).
    setTimeout(function () { applying = false }, 0)
  }

  // CSS wird gegen den ORIGINAL-Selektor generiert. Ersetzt die B-Variante das
  // Element durch anderes Markup (anderes Tag, andere Klassen), trifft dieser
  // Selektor das neue Element nicht mehr und die Variante rendert voellig
  // ungestylt — der Test verliert dann aus einem Grund, der nichts mit dem
  // getesteten Inhalt zu tun hat.
  //
  // Auf einer echten Kundenseite gemessen: CSS auf
  // "#hero-meta-right > div.hero-actions > a.hover-btn.hover-btn--white",
  // B rendert "<button class=\"ab-variant-b\">". Statt weiss/schwarz gerahmt,
  // 16px, radius 11 kam der nackte Browser-Default (grau, outset, radius 0,
  // padding 0, 13px).
  //
  // Der Selektor wird deshalb literal durch die B-Wurzel ersetzt, sobald B
  // wirklich im DOM gelandet ist. Literal, damit Suffixe wie ":hover" oder
  // " > span" erhalten bleiben. Wurde B NICHT angewandt, steht das
  // Originalelement noch da und der Selektor stimmt weiterhin.
  function scopeCssToVariant(css, selector, key) {
    if (!css || !selector || css.indexOf(selector) === -1) return css
    var attr = '[data-ab-el="' + key + '"]'
    var swapped = css.split(selector).join(attr)
    // B erbt A's Klassen: A's Site-Regeln matchen damit auch auf B. Eine
    // ID-basierte Site-Regel ("#hero .cta", Spezifitaet 1-1-0) schlaegt das
    // gescopte Delta ([data-ab-el], 0-1-0) sonst — der Test waere ein No-Op.
    // Deshalb bekommt jede Deklaration eines umgeschriebenen Blocks
    // !important. Eng begrenzt: nur Bloecke, deren Selektor NACH dem Tausch
    // auf data-ab-el zeigt. Das .ab-v-CSS des Figma-Pfads enthaelt den
    // Original-Selektor nie und bleibt unberuehrt. Attribut-Stapeln reicht
    // nicht — gegen ID-Regeln verliert es.
    return swapped.replace(/([^{}]+)(\{[^{}]*\})/g, function (match, sel, block) {
      if (sel.indexOf(attr) === -1) return match
      return sel + forceImportant(block)
    })
  }

  // Markiert jede Deklaration eines Regelblocks mit !important. Geschnitten
  // wird an ";" nur auf Klammer-Tiefe 0 — url(data:image/svg+xml;…)-Werte
  // enthalten selbst ";" und duerfen nicht zerrissen werden.
  function forceImportant(block) {
    var open = block.indexOf('{')
    var close = block.lastIndexOf('}')
    if (open === -1 || close <= open) return block
    var body = block.slice(open + 1, close)
    var parts = [], buf = '', depth = 0
    for (var i = 0; i < body.length; i++) {
      var c = body.charAt(i)
      if (c === '(') depth++
      else if (c === ')') depth = Math.max(0, depth - 1)
      if (c === ';' && depth === 0) { parts.push(buf); buf = '' }
      else buf += c
    }
    if (buf.trim()) parts.push(buf)
    var out = []
    for (var p = 0; p < parts.length; p++) {
      var decl = parts[p].trim()
      if (!decl) continue
      if (/!important\s*$/i.test(decl)) out.push(decl)
      else out.push(decl + ' !important')
    }
    if (!out.length) return block
    return block.slice(0, open + 1) + ' ' + out.join('; ') + ';' + block.slice(close)
  }

  var injectedStyles = {} // key → style-element, für SPA-Cleanup

  // Keys, deren injiziertes CSS im laufenden run() noch gebraucht wird. run()
  // legt die Map bei jedem Durchlauf neu an und entfernt am Ende genau das
  // CSS, das kein Test mehr beansprucht hat (dropUnusedCss).
  var cssInUse = {}
  function keepCss(key) { if (key) cssInUse[key] = true }

  // Steht das <style> zu diesem Key noch im Dokument? Es fehlt entweder, weil
  // nie eines injiziert wurde — oder weil die Kundenseite den <head> ersetzt
  // hat (Framework-Router, Consent-Tool, Browser-Extension).
  function cssAlive(key) {
    var el = key && injectedStyles[key]
    if (!el) return false
    try { return !!(el.parentNode && document.documentElement.contains(el)) } catch (_) { return false }
  }

  // Nach einem Resolve-Durchlauf: CSS der Tests entfernen, die auf dieser Seite
  // nicht mehr gelten. Hat ein zweites run() den Durchlauf ueberholt, raeumt
  // der alte nicht mehr auf — sonst loescht er das frische CSS des neuen.
  function dropUnusedCss(scope) {
    if (scope !== cssInUse) return
    for (var k in injectedStyles) {
      if (cssInUse[k]) continue
      try { injectedStyles[k].remove() } catch (_) {}
      delete injectedStyles[k]
    }
  }

  function applyCss(key, css) {
    if (!css) return
    keepCss(key)
    // Remove previous style for this key (SPA re-navigation)
    if (injectedStyles[key]) {
      try { injectedStyles[key].remove() } catch (_) {}
    }
    beginApply()
    var style = document.createElement('style')
    style.setAttribute('data-ab-css', key)
    style.textContent = css
    document.head.appendChild(style)
    injectedStyles[key] = style
    endApply()
  }

  // --- Interaktivität von A nach B übertragen --------------------------------
  // Die KI erzeugt B aus dem TEXT des Originals, nicht aus dessen Markup: aus
  // <a href="/signup" class="cta">Get started</a> wird regelmäßig
  // <button class="ab-variant-b">Start free</button>. Das ist dann ein BILD von
  // einem Button — kein Klickziel. B kann per Definition nicht konvertieren,
  // der Test kippt systematisch gegen B, und jeder Besucher in B verliert den
  // Weg zum Ziel. (Der Sanitizer erlaubt href — es steht nur nie eins drin.)
  //
  // Drei Fälle, absteigend nach Treue zum Original:
  //   1. A ist ein echter Link → href/target/rel/download auf B übertragen.
  //      Kann B kein href tragen (<button>, <div>), navigiert ein Klick-Handler.
  //   2. A hat ein Inline-onclick → Attribut mitnehmen.
  //   3. A hängt an addEventListener (React, SPA-Router, Analytics) → der
  //      Handler klebt am ELEMENT, nicht am Selektor, und ist nicht kopierbar.
  //      A bleibt deshalb versteckt im DOM stehen und B reicht Klicks dorthin
  //      weiter. Ein abgehängtes A würde delegierte Handler (React-Root,
  //      jQuery-on-document) nie erreichen — deshalb display:none statt remove.
  // Im ORIGINAL zählt nur, was auch wirklich klickbar ist — ein <a> ohne href
  // ist dort typischerweise Deko.
  var ACTION_SEL_SRC = 'a[href], button, [role="button"], input[type="submit"], input[type="button"], [onclick]'
  // In der VARIANTE dagegen ist genau das der Normalfall: die KI schreibt
  // <a class="cta">Start free</a> ohne href, weil sie das href nie gesehen hat.
  // Deshalb hier auch das nackte <a> als Ziel akzeptieren.
  var ACTION_SEL_DST = 'a, button, [role="button"], input[type="submit"], input[type="button"], [onclick]'

  // href-Werte, die keine Navigation sind: dort hängt ein JS-Listener dran
  // ("#", "#tab", "javascript:void(0)"). Für uns wie "kein href".
  function realHref(el) {
    var h = el && el.getAttribute ? el.getAttribute('href') : null
    if (!h) return null
    var t = h.replace(/[\u0000-\u0020]/g, '')
    if (!t || t.charAt(0) === '#') return null
    if (/^javascript:/i.test(t)) return null
    return h.trim()
  }

  // Das klickbare Element in einem Teilbaum: die Wurzel selbst, sonst das erste
  // interaktive Kind (der Picker trifft oft den Wrapper, nicht den Button).
  function findAction(root, sel) {
    if (!root || root.nodeType !== 1) return null
    try {
      if (root.matches && root.matches(sel)) return root
      return root.querySelector ? root.querySelector(sel) : null
    } catch (_) {
      return null
    }
  }

  function copyMissing(src, dst, attrs) {
    for (var i = 0; i < attrs.length; i++) {
      var v = src.getAttribute(attrs[i])
      if (v !== null && !dst.hasAttribute(attrs[i])) dst.setAttribute(attrs[i], v)
    }
  }

  // Liefert, wie B klickbar gemacht werden muss:
  //   'own'      B bringt eigene Navigation mit → nichts anfassen
  //   'attr'     Attribute reichen (B ist selbst <a>, bzw. onclick geerbt)
  //   'navigate' B braucht einen Handler, der den Link nachbaut
  //   'bridge'   B muss den Klick an das versteckte A weiterreichen
  function portInteraction(src, dst) {
    if (!src || !dst || src === dst) return null
    // Beschriftung und Zustand gehören zum Verhalten, nicht zum Design:
    // Tooltip, Screenreader-Label und ein deaktivierter Button müssen in B
    // genauso ankommen. Nur wo B nichts Eigenes mitbringt.
    copyMissing(src, dst, ['title', 'aria-label', 'disabled'])
    if (realHref(dst)) return 'own'
    var href = realHref(src)
    if (href) {
      if ((dst.tagName || '').toLowerCase() === 'a') {
        // Relativ bleibt relativ — der Browser löst gegen dieselbe Seite auf.
        dst.setAttribute('href', href)
        copyMissing(src, dst, ['target', 'rel', 'download'])
        return 'attr'
      }
      // <button>/<div> können kein href. Absolute URL merken (src.href ist
      // bereits aufgelöst), der Handler übernimmt die Navigation.
      dst.setAttribute('data-ab-href', src.href || href)
      var tgt = src.getAttribute('target')
      if (tgt) dst.setAttribute('data-ab-target', tgt)
      return 'navigate'
    }
    var onclick = src.getAttribute('onclick')
    if (onclick && !dst.hasAttribute('onclick')) {
      dst.setAttribute('onclick', onclick)
      copyMissing(src, dst, ['type', 'name', 'value', 'form'])
      return 'attr'
    }
    // Weder Link noch Inline-Handler: A wird von JS gesteuert.
    copyMissing(src, dst, ['type', 'name', 'value', 'form'])
    return 'bridge'
  }

  // --- Praesentation von A nach B uebertragen --------------------------------
  // B ist ein Delta auf A, kein Neubau: Markup, Klassen und Attribute kommen
  // von A. B traegt A's Klassen, also matchen A's Site-Regeln weiter — und mit
  // ihnen das komplette responsive Verhalten (@media, clamp(), Container-
  // Queries, :hover). Das muss nicht uebertragen werden, es gilt automatisch.
  //
  // Nur wenn B keine eigenen Site-Klassen mitbringt: class fehlt ganz oder
  // besteht nur aus unseren Markern (ab-variant-b, ab-v). Das trifft den
  // gesamten Bestand und alles aus generateBestPracticeVariant() — die werden
  // hier ohne Neugenerierung repariert. Traegt B eigene Klassen (Editor-
  // inherit-Modus), sind die bereits A's — nichts zu tun.
  //
  // data-* kann gespeichertes B-HTML nie tragen (sanitizeHtml, ALLOW_DATA_ATTR
  // false) — Component-Libraries stylen aber oft ueber [data-variant]/
  // [data-size]. Zur Laufzeit von A's eigenem DOM gelesen ist der Wert
  // unbedenklich. Interne Marker (data-ab-*) werden nie kopiert: die gehoeren
  // zu unserem eigenen Runtime-Lifecycle.
  function adoptPresentation(src, dst) {
    if (!src || !dst || src === dst || !src.getAttribute) return
    var dstCls = dst.getAttribute('class') || ''
    if (dstCls.replace(/\b(?:ab-variant-b|ab-v)\b/g, '').trim()) return
    var cls = src.getAttribute('class')
    if (cls) dst.setAttribute('class', (cls + ' ' + dstCls).trim())
    var style = src.getAttribute('style')
    // Inline-Styles von B sind dessen Delta — A's Style nur ergaenzen, wo B
    // keinen setzt (gleiche Semantik wie copyMissing).
    if (style && !dst.getAttribute('style')) dst.setAttribute('style', style)
    if (src.attributes) {
      for (var i = 0; i < src.attributes.length; i++) {
        var name = src.attributes[i].name
        if (name.indexOf('data-ab-') === 0) continue
        if (name.indexOf('data-') === 0 && !dst.hasAttribute(name)) {
          dst.setAttribute(name, src.getAttribute(name))
        }
      }
    }
  }

  // Nicht-interaktives B (z. B. <div class="ab-v">) bekommt Tastaturzugang,
  // sonst ist die Variante für Keyboard- und Screenreader-Nutzer eine Sackgasse.
  function makeClickable(dst, handler) {
    dst.addEventListener('click', handler)
    var tag = (dst.tagName || '').toLowerCase()
    if (tag === 'a' || tag === 'button' || tag === 'input') return
    if (!dst.hasAttribute('role')) dst.setAttribute('role', 'button')
    if (!dst.hasAttribute('tabindex')) dst.setAttribute('tabindex', '0')
    dst.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault()
        dst.click()
      }
    })
  }

  // --- Mauszeiger von A übernehmen ------------------------------------------
  // "Sieht klickbar aus" entscheidet der Cursor, und der kommt NICHT vom
  // Aussehen: <a href> bekommt vom Browser cursor:pointer, <button> dagegen
  // cursor:default. Wird aus dem Link <a class="cta"> die Variante
  // <button class="ab-variant-b">, zeigt der Zeiger dort also einen Pfeil —
  // B wirkt tot, obwohl der Klick längst funktioniert. Dasselbe gilt für
  // Seiten, die cursor:pointer per Klasse setzen: die Klasse ist in B weg.
  //
  // Deshalb: den EFFEKTIVEN Cursor an A messen (solange A noch im Dokument
  // steht) und auf B setzen, falls er dort anders herauskommt. Kein pauschales
  // "pointer" — wenn A z. B. cursor:not-allowed hat, gehört das zum Verhalten.
  function readCursor(el) {
    try {
      return window.getComputedStyle(el).cursor || null
    } catch (_) {
      return null
    }
  }

  function alignCursor(dst, srcCursor) {
    if (!srcCursor || !dst || !dst.style) return
    try {
      // Erst nach dem Einfügen messbar — vorher hat B keinen Style-Kontext.
      if (window.getComputedStyle(dst).cursor !== srcCursor) {
        dst.style.setProperty('cursor', srcCursor)
      }
    } catch (_) {}
  }

  // Navigation für B-Elemente, die kein href tragen können.
  // Der Conversion-Listener hängt in der Capture-Phase auf document und läuft
  // damit VOR diesem Handler — sendBeacon ist raus, bevor die Seite wechselt.
  function navigateFromAttr(ev) {
    var el = ev.currentTarget
    var href = el.getAttribute('data-ab-href')
    if (!href) return
    ev.preventDefault()
    var target = el.getAttribute('data-ab-target')
    // Mittelklick und Strg/Cmd-Klick öffnen bei einem echten Link einen neuen
    // Tab. Ein <button> täte von sich aus nichts — also nachbauen, sonst
    // verhält sich B an dieser Stelle anders als A.
    var newTab = ev.button === 1 || ev.metaKey || ev.ctrlKey
    try {
      if (target === '_blank' || newTab) window.open(href, '_blank', 'noopener')
      else if (target && target !== '_self') window.open(href, target)
      else window.location.href = href
    } catch (_) {
      window.location.href = href
    }
  }

  // Klick auf B → derselbe Klick auf dem versteckten A. Das ist der einzige Weg
  // an Handler, die per addEventListener registriert wurden.
  function bridgeTo(src) {
    return function (ev) {
      if (ev.__abBridged) return
      ev.preventDefault()
      try {
        var forwarded = new MouseEvent('click', {
          bubbles: true, cancelable: true, view: window,
          ctrlKey: ev.ctrlKey, metaKey: ev.metaKey, shiftKey: ev.shiftKey, altKey: ev.altKey,
        })
        forwarded.__abBridged = true
        src.dispatchEvent(forwarded)
      } catch (_) {
        try { src.click() } catch (__) {}
      }
    }
  }

  // --- Einblend-Animationen der eingefuegten Variante abschliessen -----------
  // B landet erst NACH dem Seitenaufbau im DOM: /api/resolve und /api/assign
  // sind zwei Roundtrips, und die Seite haengt so lange auf opacity:0. Jede
  // einmalige Entrance-Animation, die auf das neue Element matcht — aus dem CSS
  // der Kundenseite (fade-in-up, AOS-artige Keyframes) oder aus dem generierten
  // Varianten-CSS, in das der Picker `animation` des Originals mit hineinreicht
  // — startet damit genau in dem Moment, in dem reveal() die Seite sichtbar
  // macht. Alle anderen Elemente haben ihre Animation da laengst hinter sich:
  // B "baut sich auf", erscheint erst kleiner und waechst nach. Fuer den
  // Besucher sieht das aus wie verspaetetes CSS — und es verfaelscht den Test,
  // weil B anders wirkt als A.
  //
  // Web Animations API: laufende Animationen auf ihren Endzustand vorspulen
  // statt sie zu unterdruecken (unterdruecken wuerde sie nur verschieben — ein
  // wieder aktiviertes animation-name startet von vorn). Endlos laufende
  // Animationen (Puls, Spinner) bleiben unangetastet; finish() wuerde dort
  // ohnehin werfen.
  function settleAnimations(node) {
    if (!node || !node.getAnimations) return
    var anims
    // getAnimations() erzwingt selbst einen Style-Recalc — die Animationen des
    // gerade eingefuegten Knotens existieren dadurch bereits.
    try { anims = node.getAnimations({ subtree: true }) } catch (_) { return }
    for (var i = 0; i < anims.length; i++) {
      try {
        var t = anims[i].effect && anims[i].effect.getTiming ? anims[i].effect.getTiming() : null
        if (t && t.iterations === Infinity) continue
        anims[i].finish()
      } catch (_) {}
    }
  }

  // Zweimal: sofort (fuer alles, was das eigene CSS ausloest) und im naechsten
  // Frame (fuer Animationen, die Skripte der Kundenseite erst als Reaktion auf
  // den neuen Knoten setzen, z. B. per IntersectionObserver oder Klassen-Toggle).
  function settleSoon(node) {
    settleAnimations(node)
    try {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () { settleAnimations(node) })
      }
    } catch (_) {}
  }

  function hideOriginal(el, key) {
    try {
      el.setAttribute('data-ab-original', key || '1')
      el.setAttribute('aria-hidden', 'true')
      if (el.style) el.style.setProperty('display', 'none', 'important')
    } catch (_) {}
  }

  // --- Variante auf den DOM anwenden -----------------------------------------
  // Markiert die eingefügte B-Wurzel mit data-ab-el="<key>", damit Conversions
  // auch nach dem Element-Tausch zuverlässig zugeordnet werden können. Gibt true
  // zurück, wenn B tatsächlich angewandt wurde.
  function applyDom(selector, variant, html, key, css) {
    if (variant !== 'B' || !html) return false
    // Schon angewandt? MutationObserver und popstate rufen run() erneut auf.
    // Im Bridge-Fall steht A noch (versteckt) im DOM und würde beim zweiten
    // Durchlauf ein ZWEITES B daneben setzen.
    if (key && document.querySelector('[data-ab-el="' + key + '"]')) {
      // B steht noch im DOM — sein <style> aber moeglicherweise nicht mehr.
      // Genau hier verlor die Variante ihr CSS: reobserve() entfernte bei jeder
      // DOM-Mutation der Seite alle injizierten Styles, und dieser fruehe
      // Ausstieg hat sie nie wieder gesetzt. B blieb ab dann im Browser-Default
      // stehen — auffallend, sobald der Besucher (z. B. nach einem Ankerklick)
      // zum Element zurueckscrollt.
      if (cssAlive(key)) keepCss(key)
      else applyCss(key, scopeCssToVariant(css, selector, key))
      return true
    }
    var el = document.querySelector(selector)
    if (!el) return false
    beginApply()
    // CSS VOR der Mutation: vorher wurde erst getauscht und das <style> danach
    // vom Aufrufer nachgereicht. Solange in diesem Fenster nichts den Style
    // flusht, faellt das nicht auf — sobald doch (Fremdskript, Extension,
    // Layout-Read), rendert B einen Recalc lang ungestylt und springt dann auf
    // seine echte Groesse. Der Knoten traegt data-ab-el schon vor dem Einfuegen,
    // der gescopte Selektor greift also sofort.
    applyCss(key, scopeCssToVariant(css, selector, key))
    try {
      // Plain-Text (keine HTML-Tags): textContent statt DOM-Tausch.
      // Verhindert, dass z.B. <button> durch "Neuer Text" ersetzt wird.
      // Das Element bleibt dasselbe — href und Listener bleiben unangetastet.
      if (!/<[a-zA-Z]/.test(html)) {
        el.textContent = html
        if (key) el.setAttribute('data-ab-el', key)
        return true
      }
      var tmp = document.createElement('div')
      tmp.innerHTML = html
      sanitizeSvgs(tmp)
      var node = tmp.firstElementChild
      if (node) {
        if (key) node.setAttribute('data-ab-el', key)
        var src = findAction(el, ACTION_SEL_SRC)
        var dst = findAction(node, ACTION_SEL_DST) || node
        var mode = src ? portInteraction(src, dst) : null
        // Klassen/Styles von A auf B, bevor A ersetzt oder versteckt wird.
        // IMMER von el, nie von src: el ist das vom Picker ausgewaehlte
        // Element und traegt dessen Praesentation (Hintergrund, Padding,
        // Radius, Layout). src ist nur fuer die INTERAKTION relevant
        // (portInteraction) und kann ein bloss verpacktes <a>/<button> ohne
        // eigene Klassen sein, waehrend die Optik auf dem Wrapper sitzt
        // ("<div class='cta-wrapper'><a>Text</a></div>"). Traf adoptPresentation
        // in diesem Fall bisher src, bekam B dessen (leere) Klassenliste statt
        // der Wrapper-Klassen und stand komplett ungestylt da — auf Seiten mit
        // getrennter Mobile-Komposition (eigener DOM-Zweig fuer schmale
        // Viewports) traf genau das den mobilen Pfad und nie den Desktop-Pfad,
        // den die Autoren beim Anlegen des Tests gesehen hatten.
        adoptPresentation(el, dst)
        // Cursor jetzt lesen: im navigate-Zweig ist A gleich weg.
        var srcCursor = src ? readCursor(src) : null
        if (mode === 'navigate') {
          makeClickable(dst, navigateFromAttr)
          dst.addEventListener('auxclick', navigateFromAttr)
          el.replaceWith(node)
        } else if (mode === 'bridge' && el.parentNode) {
          // A muss im Dokument bleiben, sonst erreicht der weitergeleitete Klick
          // keine delegierten Handler. Nebenwirkung: :nth-child der Geschwister
          // verschiebt sich um eins — der Preis dafür, dass B überhaupt
          // funktioniert statt nur so auszusehen.
          makeClickable(dst, bridgeTo(src))
          el.parentNode.insertBefore(node, el)
          hideOriginal(el, key)
        } else {
          el.replaceWith(node)
        }
        alignCursor(dst, srcCursor)
        settleSoon(node)
        return true
      }
      el.outerHTML = html // Fallback: kein Einzel-Wurzelelement im Fragment
      // ponytail: outerHTML-Pfad geht nicht durch tmp → SVGs im Elternbaum saniert
      sanitizeSvgs(el.parentNode || el)
      return true
    } catch (_) {
      // Mutation fehlgeschlagen → das Original steht noch da. Das gescopte CSS
      // zeigt dann auf ein [data-ab-el], das es nicht gibt: ungescopt neu
      // injizieren, damit A wenigstens gestylt bleibt.
      applyCss(key, css)
      return false
    } finally {
      endApply()
    }
  }

  // --- Einen Test auflösen + anwenden (gibt ein Promise zurück) --------------
  function applyTest(t) {
    var key = t && t.snippet_key
    var selector = t && t.selector
    if (!key || !selector) return Promise.resolve()
    var goalSel = normGoal(t.goal, selector)

    function finish(variant, html, css) {
      // applyDom injiziert das gescopte CSS selbst, unmittelbar VOR dem Tausch —
      // nur so existiert B nie ungestylt im DOM. Es weiss an dieser Stelle auch
      // als einziges, ob getauscht wurde, und genau davon haengt ab, auf welchen
      // Selektor das CSS zeigen muss.
      var applied = applyDom(selector, variant, html, key, css)
      // Nicht angewandt (CSS-only-Test, Selektor trifft nichts): das Original
      // steht noch, also gilt der Original-Selektor — CSS ungescopt injizieren.
      if (variant === 'B' && !applied) {
        applyCss(key, css)
      }
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
      //
      // ponytail: Die Bedingung fragte nur, OB t.goal gesetzt ist. Bei den vom
      // Wizard erzeugten Tests ist goal aber identisch mit dem Selektor
      // ("click:<selector>") — es gibt gar kein separates Goal-Element. Damit
      // landete genau der Fall in Zweig 1 und das Klickziel war der originale
      // CSS-Selektor, obwohl B dieses Element ersetzt hatte. Sobald die
      // KI-Variante Klassen oder Tag aendert (also praktisch immer), matchte
      // e.target.closest(goalSel) nicht mehr: A zaehlte Conversions, B nie.
      // Der Test kippt dann systematisch gegen B. Verifiziert auf einer echten
      // Kundenseite: B mit gleichen Klassen -> Treffer, B mit neuen Klassen
      // oder als <button> -> kein Treffer, waehrend [data-ab-el] immer passt.
      var hasSeparateGoal = !!t.goal && goalSel !== selector
      var gsel
      if (variant === 'B' && hasSeparateGoal) {
        gsel = goalSel          // echtes separates Goal → originaler Selektor
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
      var forced = t.variant_b_html
        ? applyDom(selector, 'B', t.variant_b_html, key, t.variant_b_css)
        : false
      if (!forced) applyCss(key, t.variant_b_css)
      return Promise.resolve()
    }

    // Sticky: bereits zugewiesene Variante aus dem Cache (kein erneuter Counter).
    var cached = lsGet('ab_' + key)
    if (cached) {
      try {
        var d = JSON.parse(cached)
        if (d && (d.variant === 'A' || d.variant === 'B')) {
          // Variante B wurde seit der Zuweisung bearbeitet? Dann die AKTUELLE
          // Fassung rendern statt der eingefrorenen alten. Hier lag der Kern von
          // Katalog EDIT-01: der Cache haelt das gerenderte HTML, nicht bloss die
          // Zuweisung, und ohne Versionsbezug behielten Bestandsbesucher die alte
          // Fassung dauerhaft — waehrend neue Besucher die neue sahen und beide
          // in dieselben conversions_b zaehlten.
          //
          // Der Arm bleibt bewusst derselbe: kein zweites /api/assign, also auch
          // kein doppelt gezaehlter Besucher und kein Wechsel von B nach A.
          if (d.variant === 'B' && t.v && d.v !== t.v) {
            d.html = t.variant_b_html || null
            d.css = t.variant_b_css || null
            d.v = t.v
            lsSet('ab_' + key, JSON.stringify(d))
          }
          finish(d.variant, d.html, d.css)
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
        // Plan DATA-01: Token für Conversion-Verifikation speichern.
        // Ohne Token würde /api/event Gelegenheitsfälschungen akzeptieren.
        var token = res.token || null
        if (res.variant === 'A') {
          lsSet('ab_' + key, JSON.stringify({ variant: 'A', token: token }))
          finish('A', null, null)
          return
        }
        var html = t.variant_b_html
        var css = t.variant_b_css
        if (html || css) {
          lsSet('ab_' + key, JSON.stringify({ variant: 'B', html: html || null, css: css || null, token: token, v: t.v || null }))
          finish('B', html, css)
        } else {
          // Noch kein generiertes HTML/CSS → assign wurde trotzdem aufgerufen,
          // Besucher ist gezählt. A anzeigen, aber nicht cachen (damit beim
          // nächsten Page-View erneut assign aufgerufen wird und ggf. B-HTML
          // inzwischen existiert).
          finish('A', null, null)
        }
      })
      .catch(function () {})
  }

  // --- SPA-Support: bei History-Navigation erneut auflösen -------------------
  // Setzt active zurück (alte data-ab-el existieren nicht mehr im neu
  // gerenderten DOM) und führt run() erneut aus.
  function reobserve() {
    active = []
    // Die injizierten <style> bleiben absichtlich stehen: run() ersetzt sie pro
    // Key und entfernt am Ende nur, was kein Test mehr beansprucht
    // (dropUnusedCss). Wurden sie hier sofort entfernt, stand die Variante
    // zwischen Aufraeumen und Neu-Injektion einen /api/resolve-Roundtrip lang
    // ungestylt da — und auf jeder Seite, die ueberhaupt mutiert
    // (Lazy-Loading, Karussell, Chat-Widget), dauerhaft.
    run()
  }

  // --- Clientseitiges Path-Matching (kein Pfad-Tracking zum Server) ---------
  // Repliziert die server-seitige pathOf/Filter-Logik. DSGVO: Der Server
  // sieht nur den Host, nicht welche Seiten ein Besucher aufruft.
  function pathMatches(testPath, currentPath) {
    // testPath stammt aus site_url und wurde serverseitig via pathOf extrahiert.
    // Die drei Fälle müssen exakt zu pathOf() in /api/resolve passen —
    // abgesichert durch __tests__/resolve-path-semantics.mjs.

    // Kein Pfad angegeben: der Test gilt für jede Seite dieser Domain.
    if (!testPath) return true

    // Nur die Wurzel: ausschließlich die Startseite. Ein Prefix-Match wäre hier
    // gleichbedeutend mit "überall" — unter '/' liegt jeder Pfad.
    if (testPath === '/') return currentPath === '/'

    // Sonst der Pfad selbst und alles darunter: '/blog' matcht auch
    // '/blog/post-1', aber nicht '/blog-archiv' (daher das '/' im Vergleich).
    return currentPath === testPath || currentPath.indexOf(testPath + '/') === 0
  }

  // --- Hauptlogik ------------------------------------------------------------
  function run() {
    installDelegation()

    // Aufraeum-Bereich dieses Durchlaufs: applyCss/keepCss tragen hier ein,
    // welches injizierte CSS noch gebraucht wird.
    var cssScope = {}
    cssInUse = cssScope

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
          dropUnusedCss(cssScope)
          reveal()
          return
        }
        return Promise.all(tests.map(applyTest)).then(function () {
          dropUnusedCss(cssScope)
          reveal()
        })
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
    // ============================================================
    // Plan BUG-01: Diese Stelle war eine Request-Schleife.
    //
    // Vorher rief JEDE DOM-Mutation sofort reobserve() -> run() ->
    // fetch('/api/resolve'). Auf jeder realen Website mutiert das DOM
    // permanent (Karussells, Chat-Widgets, Lazy-Loading, React-Re-Renders,
    // Cookie-Banner). Dazu kam, dass applyDom() selbst mutiert und den
    // Observer damit erneut ausloeste.
    //
    // Folge: hunderte Requests pro Sekunde aus dem Browser jedes Besuchers,
    // das 30/min-Rate-Limit riss nach ~2 Sekunden -> 429 -> der Test lief fuer
    // diesen Besucher gar nicht mehr. Plus Vercel-Invocations und
    // Supabase-Reads auf unsere Rechnung.
    //
    // Jetzt: Guard gegen selbst verursachte Mutationen + 500 ms Debounce +
    // Mindestabstand zwischen zwei Resolve-Runden.
    // ============================================================
    var moTimer = null
    var MO_DEBOUNCE_MS = 500
    var MO_MIN_INTERVAL_MS = 5000
    var lastRun = Date.now()

    var mo = new MutationObserver(function () {
      if (applying) return                 // eigene Mutation
      if (active.length === 0) return      // nichts anzuwenden
      if (moTimer) return                  // Debounce laeuft bereits
      var wait = Math.max(MO_DEBOUNCE_MS, MO_MIN_INTERVAL_MS - (Date.now() - lastRun))
      moTimer = setTimeout(function () {
        moTimer = null
        lastRun = Date.now()
        reobserve()
      }, wait)
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
