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
  function applyDom(selector, variant, html) {
    if (variant === 'B' && html) {
      var el = document.querySelector(selector)
      if (el) {
        try {
          el.outerHTML = html
        } catch (_) {}
      }
    }
  }

  // --- Einen Test auflösen + anwenden (gibt ein Promise zurück) --------------
  function applyTest(t) {
    var key = t && t.snippet_key
    var selector = t && t.selector
    if (!key || !selector) return Promise.resolve()
    var goalSel = normGoal(t.goal, selector)

    function finish(variant, html) {
      applyDom(selector, variant, html)
      active.push({ key: key, variant: variant, goalSel: goalSel })
    }

    // Abgeschlossener Test mit Gewinner B: ALLE Besucher bekommen B ausgeliefert,
    // ohne Assign-Counter und ohne Conversion-Tracking (Test ist beendet).
    if (t.force === 'B') {
      return fetch(origin + '/api/variant?testId=' + encodeURIComponent(key))
        .then(function (r) {
          return r.ok ? r.json() : null
        })
        .then(function (vres) {
          if (vres && vres.html) applyDom(selector, 'B', vres.html)
        })
        .catch(function () {})
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

    // Erstbesuch: Variante zuweisen lassen.
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
        return fetch(origin + '/api/variant?testId=' + encodeURIComponent(key))
          .then(function (r) {
            return r.ok ? r.json() : null
          })
          .then(function (vres) {
            if (vres && vres.html) {
              lsSet('ab_' + key, JSON.stringify({ variant: 'B', html: vres.html }))
              finish('B', vres.html)
            } else {
              // Noch kein generiertes HTML → wie A behandeln, nicht cachen.
              finish('A', null)
            }
          })
      })
      .catch(function () {})
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
        var tests = res && res.tests ? res.tests : []
        if (!tests.length) {
          reveal()
          return
        }
        return Promise.all(tests.map(applyTest)).then(reveal)
      })
      .catch(reveal)
  }

  // Erst nach dem Parsen des DOM anwenden, damit das Zielelement existiert.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }
})()
