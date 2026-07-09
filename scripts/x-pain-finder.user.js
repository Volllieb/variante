// ==UserScript==
// @name         variante - X Pain Post Finder
// @namespace    https://getvariante.com
// @version      1.1
// @description  Hebt Posts auf X-Suchseiten hervor, die Pain-Signale zu A/B-Testing/Design-Testing enthalten
// @author       variante
// @match        https://x.com/search*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // -- Pain-Keywords --
  // Jeder Treffer = Post bekommt farbigen Rand + Label
  const PAIN_PATTERNS = [
    // Starkes Signal (rot) - Frust, aktive Suche
    { regex: /\b(no|without)\s+A\/?B\s+(test|testing)\b/i, label: "!! NO A/B", color: "#ef4444", priority: 1 },
    { regex: /\bcan'?t\s+(test|A\/B)\b/i, label: "!! CAN'T TEST", color: "#ef4444", priority: 1 },
    { regex: /\bhow\s+(do|can|to)\s+(you|I)\s+(test|A\/B|split)\b/i, label: "!! ASKING HOW", color: "#ef4444", priority: 1 },
    { regex: /\bany(one|body)\s+(know|recommend).{0,30}(test|A\/B|split)\b/i, label: "!! LOOKING", color: "#ef4444", priority: 1 },

    // Mittleres Signal (orange) - Pain erkennbar
    { regex: /\b(too\s+(expensive|complex|complicated).{0,20}(test|A\/B|optimizely|VWO))\b/i, label: "! TOO EXPENSIVE", color: "#f97316", priority: 2 },
    { regex: /\b(overkill|overengineered).{0,20}(test|A\/B)\b/i, label: "! OVERKILL", color: "#f97316", priority: 2 },
    { regex: /\bdeploy\s+and\s+pray\b/i, label: "! DEPLOY & PRAY", color: "#f97316", priority: 2 },
    { regex: /\bno\s+idea\s+(which|what)\s+(converts|works|performs)\b/i, label: "! NO IDEA", color: "#f97316", priority: 2 },
    { regex: /\bshipped?.{0,30}(can'?t|cannot|don'?t|no\s+way).{0,20}test\b/i, label: "! SHIPPED BLIND", color: "#f97316", priority: 2 },

    // Schwaches Signal (gelb) - Kontext-relevant
    { regex: /\b(v0|bolt\.new|lovable|create\.xyz|replit).{0,30}(website|landing|page|site)\b/i, label: "AI-BUILDER", color: "#eab308", priority: 3 },
    { regex: /\b(wordpress|custom\s+html|shopify).{0,30}(test|A\/B|split)\b/i, label: "PLATFORM", color: "#eab308", priority: 3 },
    { regex: /\bconversion\s+rate.{0,20}(down|dropped|low|bad|terrible)\b/i, label: "CR DOWN", color: "#eab308", priority: 3 },
    { regex: /\b(figma|design).{0,30}(to|->).{0,10}(live|production|code|web)\b/i, label: "FIGMA->LIVE", color: "#eab308", priority: 3 },
  ];

  // -- Reply-Templates (im Clipboard, kein Auto-Post) --
  const REPLY_TEMPLATES = {
    "NO A/B": "The deploy-and-pray pipeline is real. What stack are you on -- custom, WP, something else?",
    "CAN'T TEST": "What's the blocker -- no tool fits, or too complex to set up?",
    "ASKING HOW": "Depends: simple (one headline) or full pages? Different answer for each.",
    "LOOKING": "What's 'simple' for you -- no-code setup, or under $50/mo?",
    "TOO EXPENSIVE": "Enterprise tools pricing out solo builders, classic. Are you testing your own product or client sites?",
    "OVERKILL": "The entire A/B market is built for PMs at 200-person companies. What would 'lightweight' look like for you?",
    "DEPLOY & PRAY": "The silent killer of AI-generated sites. Everyone ships, nobody tests. What's your stack?",
    "NO IDEA": "How do you know which version won -- gut feeling or did you have a way to measure?",
    "SHIPPED BLIND": "What would you test first if you had a one-click option?",
    "AI-BUILDER": "How do you test which AI-generated version converts better? Or do you just ship and hope?",
    "PLATFORM": "Testing on {platform} -- are you using a plugin or manual traffic split?",
    "CR DOWN": "When CR drops, do you know which change caused it, or is it guesswork?",
    "FIGMA->LIVE": "The Figma-to-live pipeline has a gap: design in Figma, ship to web, but never test. Is that your flow too?",
  };

  // -- Highlight-Logik --
  function findPainLabel(text) {
    for (var i = 0; i < PAIN_PATTERNS.length; i++) {
      if (PAIN_PATTERNS[i].regex.test(text)) return PAIN_PATTERNS[i];
    }
    return null;
  }

  function highlightPost(article, pain) {
    if (article.dataset.varianteScanned === "true") return;
    article.dataset.varianteScanned = "true";

    // Farbiger linker Rand
    article.style.setProperty("border-left", "3px solid " + pain.color, "important");
    article.style.setProperty("padding-left", "13px", "important");

    // Label-Badge oben rechts im Post
    var label = document.createElement("div");
    label.textContent = pain.label;
    label.style.cssText = [
      "position:absolute;top:4px;right:8px",
      "background:" + pain.color + "22;color:" + pain.color,
      "font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,sans-serif",
      "padding:2px 6px;border-radius:4px",
      "pointer-events:none;z-index:1",
      "opacity:0.85"
    ].join(";");

    if (getComputedStyle(article).position === "static") {
      article.style.position = "relative";
    }
    article.appendChild(label);
  }

  function scanPosts() {
    var articles = document.querySelectorAll("article[data-testid='tweet']");
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (a.dataset.varianteScanned === "true") continue;
      var text = a.textContent || "";
      var pain = findPainLabel(text);
      if (pain) {
        highlightPost(a, pain);
      } else {
        a.dataset.varianteScanned = "true";
      }
    }
  }

  // -- Sidebar --
  function createSidebar() {
    var sb = document.createElement("div");
    sb.id = "variante-sidebar";
    sb.innerHTML = [
      '<div style="',
        'position:fixed;bottom:20px;right:20px;z-index:9999;',
        'background:#0a0a0a;border:1px solid rgba(255,255,255,.12);',
        'border-radius:12px;padding:14px 16px;',
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:#ededed;',
        'min-width:220px;max-width:280px;',
        'box-shadow:0 8px 32px rgba(0,0,0,.6);',
      '">',
        '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">variante Pain Finder</div>',
        '<div id="variante-stats" style="color:rgba(237,237,237,.62);font-size:12px;margin-bottom:10px;">Scanning...</div>',
        '<div id="variante-reply-template" style="',
          'background:#111;border-radius:8px;padding:10px;',
          'color:rgba(237,237,237,.62);font-size:12px;',
          'min-height:20px;margin-bottom:8px;display:none;',
        '"></div>',
        '<button id="variante-copy-btn" style="',
          'display:none;width:100%;padding:6px 0;',
          'background:#fff;color:#000;border:none;border-radius:6px;',
          'font-size:12px;font-weight:600;cursor:pointer;',
        '">Copy Reply</button>',
        '<button id="variante-rescan-btn" style="',
          'width:100%;padding:4px 0;margin-top:8px;',
          'background:transparent;color:rgba(237,237,237,.4);',
          'border:1px solid rgba(255,255,255,.08);border-radius:6px;',
          'font-size:11px;cursor:pointer;',
        '">Re-Scan</button>',
      '</div>'
    ].join("");
    document.body.appendChild(sb);

    document.getElementById("variante-rescan-btn").addEventListener("click", function () {
      var all = document.querySelectorAll("article[data-testid='tweet']");
      for (var i = 0; i < all.length; i++) {
        delete all[i].dataset.varianteScanned;
      }
      scanPosts();
      updateStats();
    });

    document.addEventListener("click", function (e) {
      var article = e.target.closest("article[data-testid='tweet']");
      if (!article || article.dataset.varianteScanned !== "true") return;
      var text = article.textContent || "";
      var pain = findPainLabel(text);
      if (!pain) return;

      var td = document.getElementById("variante-reply-template");
      var cb = document.getElementById("variante-copy-btn");
      var labelKey = pain.label.replace(/^!{1,2}\s*/, "");
      var tpl = REPLY_TEMPLATES[labelKey] || "What's your current setup for testing?";

      td.style.display = "block";
      td.textContent = tpl;
      cb.style.display = "block";
      cb.onclick = function () {
        navigator.clipboard.writeText(tpl).then(function () {
          cb.textContent = "Copied!";
          setTimeout(function () { cb.textContent = "Copy Reply"; }, 1500);
        });
      };
    });
  }

  function updateStats() {
    var all = document.querySelectorAll("article[data-testid='tweet']");
    var painCount = 0;
    for (var i = 0; i < all.length; i++) {
      if (findPainLabel(all[i].textContent || "") !== null) painCount++;
    }
    var sd = document.getElementById("variante-stats");
    if (sd) {
      sd.textContent = painCount + " Pain-Posts found / " + all.length + " scanned";
    }
  }

  function init() {
    createSidebar();
    scanPosts();
    updateStats();

    new MutationObserver(function () {
      scanPosts();
      updateStats();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
