// ==UserScript==
// @name         variante ÔÇö X Pain Post Finder
// @namespace    https://getvariante.com
// @version      1.0
// @description  Hebt Posts auf X-Suchseiten hervor, die Pain-Signale zu A/B-Testing/Design-Testing enthalten
// @author       variante
// @match        https://x.com/search*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ÔöÇÔöÇ Pain-Keywords ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Jeder Treffer = Post bekommt farbigen Rand + Label
  const PAIN_PATTERNS = [
    // Starkes Signal (rot) ÔÇö Frust, aktive Suche
    { regex: /\b(no|without)\s+A\/?B\s+(test|testing)\b/i, label: "­ƒöÑ NO A/B", color: "#ef4444", priority: 1 },
    { regex: /\bcan'?t\s+(test|A\/B)\b/i, label: "­ƒöÑ CAN'T TEST", color: "#ef4444", priority: 1 },
    { regex: /\bhow\s+(do|can|to)\s+(you|I)\s+(test|A\/B|split)\b/i, label: "­ƒöÑ ASKING HOW", color: "#ef4444", priority: 1 },
    { regex: /\bany(one|body)\s+(know|recommend).{0,30}(test|A\/B|split)\b/i, label: "­ƒöÑ LOOKING", color: "#ef4444", priority: 1 },

    // Mittleres Signal (orange) ÔÇö Pain erkennbar
    { regex: /\b(too\s+(expensive|complex|complicated).{0,20}(test|A\/B|optimizely|VWO))\b/i, label: "­ƒƒá TOO EXPENSIVE", color: "#f97316", priority: 2 },
    { regex: /\b(overkill|overengineered).{0,20}(test|A\/B)\b/i, label: "­ƒƒá OVERKILL", color: "#f97316", priority: 2 },
    { regex: /\bdeploy\s+and\s+pray\b/i, label: "­ƒƒá DEPLOY & PRAY", color: "#f97316", priority: 2 },
    { regex: /\bno\s+idea\s+(which|what)\s+(converts|works|performs)\b/i, label: "­ƒƒá NO IDEA", color: "#f97316", priority: 2 },
    { regex: /\bshipped?.{0,30}(can'?t|cannot|don'?t|no\s+way).{0,20}test\b/i, label: "­ƒƒá SHIPPED BLIND", color: "#f97316", priority: 2 },

    // Schwaches Signal (gelb) ÔÇö Kontext-relevant
    { regex: /\b(v0|bolt\.new|lovable|create\.xyz|replit).{0,30}(website|landing|page|site)\b/i, label: "­ƒƒí AI-BUILDER", color: "#eab308", priority: 3 },
    { regex: /\b(wordpress|custom\s+html|shopify).{0,30}(test|A\/B|split)\b/i, label: "­ƒƒí PLATFORM", color: "#eab308", priority: 3 },
    { regex: /\bconversion\s+rate.{0,20}(down|dropped|low|bad|terrible)\b/i, label: "­ƒƒí CR DOWN", color: "#eab308", priority: 3 },
    { regex: /\b(figma|design).{0,30}(to|ÔåÆ).{0,10}(live|production|code|web)\b/i, label: "­ƒƒí FIGMAÔåÆLIVE", color: "#eab308", priority: 3 },
  ];

  // ÔöÇÔöÇ Reply-Templates (im Clipboard, kein Auto-Post) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const REPLY_TEMPLATES = {
    "NO A/B": "The deploy-and-pray pipeline is real. What stack are you on ÔÇö custom, WP, something else?",
    "CAN'T TEST": "What's the blocker ÔÇö no tool fits, or too complex to set up?",
    "ASKING HOW": "Depends: simple (one headline) or full pages? Different answer for each.",
    "LOOKING": "What's 'simple' for you ÔÇö no-code setup, or under $50/mo?",
    "TOO EXPENSIVE": "Enterprise tools pricing out solo builders, classic. Are you testing your own product or client sites?",
    "OVERKILL": "The entire A/B market is built for PMs at 200-person companies. What would 'lightweight' look like for you?",
    "DEPLOY & PRAY": "The silent killer of AI-generated sites. Everyone ships, nobody tests. What's your stack?",
    "NO IDEA": "How do you know which version won ÔÇö gut feeling or did you have a way to measure?",
    "SHIPPED BLIND": "What would you test first if you had a one-click option?",
    "AI-BUILDER": "How do you test which AI-generated version converts better? Or do you just ship and hope?",
    "PLATFORM": "Testing on {platform} ÔÇö are you using a plugin or manual traffic split?",
    "CR DOWN": "When CR drops, do you know which change caused it, or is it guesswork?",
    "FIGMAÔåÆLIVE": "The Figma-to-live pipeline has a gap: design in Figma, ship to web, but never test. Is that your flow too?",
  };

  // ÔöÇÔöÇ Highlight-Logik ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function findPainLabel(text) {
    for (const p of PAIN_PATTERNS) {
      if (p.regex.test(text)) return p;
    }
    return null;
  }

  function highlightPost(article, pain) {
    if (article.dataset.varianteScanned === "true") return;
    article.dataset.varianteScanned = "true";

    // Farbiger linker Rand
    article.style.setProperty("border-left", `3px solid ${pain.color}`, "important");
    article.style.setProperty("padding-left", "13px", "important");

    // Label-Badge oben rechts im Post
    const label = document.createElement("div");
    label.textContent = pain.label;
    label.style.cssText = `
      position: absolute; top: 4px; right: 8px;
      background: ${pain.color}22; color: ${pain.color};
      font-size: 11px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 2px 6px; border-radius: 4px;
      pointer-events: none; z-index: 1;
      opacity: 0.85;
    `;
    // Position relativ zum article
    if (getComputedStyle(article).position === "static") {
      article.style.position = "relative";
    }
    article.appendChild(label);
  }

  function scanPosts() {
    // X verwendet <article> f├╝r Posts
    const articles = document.querySelectorAll("article[data-testid='tweet']");
    for (const article of articles) {
      if (article.dataset.varianteScanned === "true") continue;
      const text = article.textContent || "";
      const pain = findPainLabel(text);
      if (pain) {
        highlightPost(article, pain);
      } else {
        article.dataset.varianteScanned = "true";
      }
    }
  }

  // ÔöÇÔöÇ Sidebar: Stats + Quick-Copy ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function createSidebar() {
    const sidebar = document.createElement("div");
    sidebar.id = "variante-sidebar";
    sidebar.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: #0a0a0a; border: 1px solid rgba(255,255,255,.12);
        border-radius: 12px; padding: 14px 16px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px; color: #ededed;
        min-width: 220px; max-width: 280px;
        box-shadow: 0 8px 32px rgba(0,0,0,.6);
      ">
        <div style="font-weight:700; font-size:14px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
          ­ƒÉ╝ variante Pain Finder
        </div>
        <div id="variante-stats" style="color: rgba(237,237,237,.62); font-size:12px; margin-bottom:10px;">
          Scanning...
        </div>
        <div id="variante-reply-template" style="
          background: #111; border-radius: 8px; padding: 10px;
          color: rgba(237,237,237,.62); font-size: 12px;
          min-height: 20px; margin-bottom: 8px; display: none;
        "></div>
        <button id="variante-copy-btn" style="
          display: none; width: 100%; padding: 6px 0;
          background: #fff; color: #000; border: none; border-radius: 6px;
          font-size: 12px; font-weight: 600; cursor: pointer;
        ">­ƒôï Copy Reply</button>
        <button id="variante-rescan-btn" style="
          width: 100%; padding: 4px 0; margin-top: 8px;
          background: transparent; color: rgba(237,237,237,.4); border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px; font-size: 11px; cursor: pointer;
        ">­ƒöä Re-Scan</button>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Rescan-Button
    document.getElementById("variante-rescan-btn").addEventListener("click", () => {
      document.querySelectorAll("article[data-testid='tweet']").forEach((a) => {
        delete a.dataset.varianteScanned;
      });
      scanPosts();
      updateStats();
    });

    // Click auf hervorgehobene Posts ÔåÆ Template anzeigen
    document.addEventListener("click", (e) => {
      const article = e.target.closest("article[data-testid='tweet']");
      if (!article || article.dataset.varianteScanned !== "true") return;
      const text = article.textContent || "";
      const pain = findPainLabel(text);
      if (!pain) return;

      const templateDiv = document.getElementById("variante-reply-template");
      const copyBtn = document.getElementById("variante-copy-btn");
      const labelKey = pain.label.replace(/^[­ƒöÑ­ƒƒá­ƒƒí]\s*/, "");
      const template = REPLY_TEMPLATES[labelKey] || "What's your current setup for testing?";

      templateDiv.style.display = "block";
      templateDiv.textContent = template;
      copyBtn.style.display = "block";

      copyBtn.onclick = () => {
        navigator.clipboard.writeText(template).then(() => {
          copyBtn.textContent = "Ô£à Copied!";
          setTimeout(() => { copyBtn.textContent = "­ƒôï Copy Reply"; }, 1500);
        });
      };
    });
  }

  function updateStats() {
    const total = document.querySelectorAll("article[data-testid='tweet']").length;
    const highlighted = document.querySelectorAll(
      "article[data-testid='tweet'][data-variante-scanned='true']"
    ).length;
    // Z├ñhle nur die mit Pain-Label
    const painCount = [...document.querySelectorAll("article[data-testid='tweet']")].filter((a) => {
      const text = a.textContent || "";
      return findPainLabel(text) !== null;
    }).length;

    const statsDiv = document.getElementById("variante-stats");
    if (statsDiv) {
      statsDiv.textContent = `${painCount} Pain-Posts gefunden ┬À ${total} gescannt`;
    }
  }

  // ÔöÇÔöÇ Start ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function init() {
    createSidebar();
    scanPosts();
    updateStats();

    // MutationObserver: Neue Posts beim Scrollen
    const observer = new MutationObserver(() => {
      scanPosts();
      updateStats();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
