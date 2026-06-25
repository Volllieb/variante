(function () {
  'use strict'

  // ===========================================================================
  // AB-Testing — universeller Client (V2.1)
  // Der Snippet im <head> ist auf jeder Seite identisch und trägt KEINE
  // Test-Daten. ab.js löst über die aktuelle URL (/api/resolve) auf, welche
  // Tests greifen, weist Varianten zu und trackt Conversions per Delegation.
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

  // Anti-Flicker: Klasse auf <html> entfernen (vom Snippet gesetzt). Idempotent.
  function reveal() {
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
      // Goal-Selektor nach B-Tausch IMMER auf data-ab-el umstellen, damit
      // auch abweichende Goal-Selektoren (z. B. Button in getestetem Container)
      // nach dem outerHTML-Tausch noch matchen.
      var gsel = goalSel
      if (variant === 'B' && applied) {
        gsel = '[data-ab-el="' + key + '"]'
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
    return fetch(origin + '/api/assign?testId=' + encodeURIComponent(key))
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

  // --- Hauptlogik ------------------------------------------------------------
  function run() {
    installDelegation()

    var q =
      '?host=' + encodeURIComponent(location.host) + '&path=' + encodeURIComponent(location.pathname)

    fetch(origin + '/api/resolve' + q)
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (res) {
        if (res && res.badge) showBadge()
        var tests = res && res.tests ? res.tests : []
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
