# A/B Testing Tool — User Guide

Designer-native A/B testing: pick an element in Figma, let AI generate Variant B, paste one snippet, watch results.

---

## Prerequisites

Before running your first test, you need two things installed:

### 1. Figma Plugin

1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest**
3. Select the `figma-plugin/manifest.json` file from the project folder
4. The plugin now appears under **Plugins → Development → A/B Testing**

### 2. Chrome Extension

The Chrome Extension powers the element picker on your live site. It needs to be installed once.

**Download:** Click **"⬇ Download Chrome Extension"** inside the Figma Plugin (shown on the element picker screen), or open this URL directly in Chrome:

```
https://ab-tool-pied.vercel.app/chrome-extension.zip
```

**Install steps:**

1. Download the ZIP and unzip it to a permanent folder (e.g. `Documents/ab-extension/`)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the unzipped `chrome-extension/` folder
6. The extension icon appears in your Chrome toolbar — installation done

> The extension does not need to be reinstalled after updates. If the source files change, just click the reload icon (↺) on the extension card in `chrome://extensions`.

---

## Full Flow: Creating an A/B Test

### Step 1 — Open the Plugin

In Figma, go to **Plugins → Development → A/B Testing**. The dashboard opens, showing all existing tests grouped by page URL.

### Step 2 — Create a New Test

Click **"+ New Test"** and fill in:

| Field | What to enter |
|-------|---------------|
| **Name** | A short label for this test, e.g. `Hero CTA` |
| **Site URL** | The full URL of the page you want to test, e.g. `https://your-site.com/pricing` |

Click **"Create test →"**. The plugin saves the test and automatically opens the next step.

### Step 3 — Pick the Element to Test (Chrome Extension)

The plugin opens your site in Chrome with the element picker active. The Chrome Extension is required here.

**What happens automatically:**
- Chrome opens `https://your-site.com/pricing#ab_pick=<testId>`
- The Chrome Extension detects the URL hash and activates the picker overlay

**What you do:**
1. Click the element on your site that you want to A/B test (e.g. a button, headline, or card)
2. The extension captures the element's CSS selector and original HTML, then sends it to the server
3. The Figma Plugin detects the selection and moves to the next screen automatically

> **Browser not opening?** Expand "Browser not opening? Open manually" in the plugin and click "Open site in browser" to trigger it again.

> **Don't have the extension?** Click "⬇ Download Chrome Extension" on this screen and follow the install steps above.

### Step 4 — Select Variant B in Figma

Back in Figma, click the layer that represents your redesigned element — the new version you want to test as **Variant B**.

- Any layer works: a frame, a group, or a single button
- The plugin shows a live indicator as you click different layers
- Once you have the right layer selected, click **"Continue — Export Variant B →"**

The plugin exports a PNG screenshot of your Figma selection and sends it to the AI.

### Step 5 — Set the Conversion Goal

The plugin asks: *which click on your site counts as a success?*

**If the tested element is a button or link** (clickable), it is pre-selected as the goal by default. You can confirm it or pick a different element from the dropdown.

**If the tested element is text or an image** (not clickable), you must pick a goal:
- Choose from the dropdown (populated with all clickable elements on the page)
- Or click **"Pick goal in Chrome"** to click directly on the element in your browser

Click **"Generate →"** when the goal is set.

### Step 6 — AI Generates Variant B HTML

The AI (DeepSeek) receives:
- A screenshot of your Figma design
- The original HTML/CSS of the element from your live site
- The computed styles and hover rules

It generates the HTML needed to make the live element look like your Figma design. The output wraps the element in an `.ab-v` container and includes a single scoped `<style>` block, so **hover and focus states (`:hover`, `:focus-visible`) plus transitions are reliably generated** — important for trustworthy button tests.

**Reviewing the output:**
- Left panel: your Figma reference screenshot
- Right panel: Variant B rendered in the browser (without site fonts/CSS — approximate)
- Expand **"Show HTML"** to inspect the raw code

**Refining the result:**
- Click **"Regenerate"** to run the AI again with the same inputs.
- Or use the **"Was soll geändert werden?"** free-text field + **"↻ Mit KI verfeinern"** to send targeted feedback (e.g. *"button bolder, clearer hover"*). This runs a second AI call with the previous output as context.
- The **Scope** dropdown limits what the AI may touch: *Alles* (everything), *Nur Text* (text only), or *Nur Farben* (colours only). Useful for surgical iterations.

Once satisfied, click **"Looks good →"**.

### Step 7 — Install the Snippet

The plugin generates a universal tracking snippet. Copy it and paste it into the `<head>` of **every page on your site** — it works across all tests and all pages with a single paste.

```html
<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");
setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},1500)</script>
<script async src="https://ab-tool-pied.vercel.app/ab.js"></script>
```

**What the snippet does:**
1. Briefly hides the page (max 1.5s) to prevent the original element from flickering before Variant B loads
2. Loads `ab.js` from the server, which resolves the current page URL to find any active tests
3. For each active test: assigns the visitor to Variant A or B (50/50, sticky per browser), applies Variant B's HTML if needed, and listens for clicks on the conversion goal

> The snippet is **identical on every page** — no test IDs or selectors are hardcoded in it. Everything is resolved server-side by matching the page URL against `site_url` of active tests.

### Step 8 — Monitor Results

Click **"View Results →"** (or click any test in the dashboard) to see live stats, updated every 30 seconds:

| Metric | Description |
|--------|-------------|
| **Visitors A / B** | Unique sessions assigned to each variant |
| **Conversions A / B** | Goal clicks per variant |
| **CR A / CR B** | Conversion rate (conversions ÷ visitors) |
| **Significance** | Statistical confidence that the difference is real (chi-square test) |

**A winner is declared automatically** when all of these hold:
- Total visitors (A + B) ≥ **Mindest-Besucher** (configurable, default 100), AND
- Variant B's relative uplift over A ≥ **Mindest-Uplift** (configurable, default +5%), AND
- Significance ≥ 95% (safety guard)

Configure both thresholds in the **"Automatischer Gewinner"** panel on the results screen.

**When B wins, the test completes (`status = done`) and Variant B is served to _all_ new visitors** — the snippet stops splitting traffic and shows B to everyone. (If A is better, no winner is forced and the original simply stays.)

The winning variant is shown as a banner in the results screen and on the dashboard card.

---

## Managing Tests

### Pause a Test

Click the ⏸️ button on a test card in the dashboard. While paused:
- Visitors are still assigned to variants (so the split stays stable)
- Conversion clicks are **not counted** (status 409)
- The card is visually dimmed

Resume with the ▶️ button.

### Delete a Test

Click the 🗑️ button on a test card. Confirm the dialog. This permanently removes the test and all its data.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Element picker does nothing when I click | Make sure the Chrome Extension is installed and enabled in `chrome://extensions` |
| Browser doesn't open automatically | Use "Open site in browser" in the fallback section of the plugin |
| "No data yet" after installing snippet | Check that `site_url` of the test matches the URL where the snippet is installed (including path) |
| AI generation fails | Retry with "Regenerate" — the AI API occasionally times out on the first attempt |
| Variant B looks wrong | Click "Regenerate" — describe what's wrong in a follow-up if it keeps failing |
| Snippet causes a flash of invisible content | The anti-flicker hider has a 1.5s hard timeout fallback; if your page loads in > 1.5s, increase the timeout value in the snippet |

---

## Architecture Overview

```
Figma Plugin  ──►  /api/tests      (create test, save selector & goal)
Chrome Ext    ──►  /api/capture    (send element selector + original HTML)
ab.js (site)  ──►  /api/resolve    (match page URL → active tests)
              ──►  /api/assign     (get A or B variant for this visitor)
              ──►  /api/variant    (fetch Variant B HTML)
              ──►  /api/event      (record conversion clicks)
```

All API routes live at `https://ab-tool-pied.vercel.app`. The Supabase database stores tests, counters, and generated HTML. Significance is calculated server-side on every conversion event.
