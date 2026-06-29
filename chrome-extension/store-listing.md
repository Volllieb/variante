# Chrome Web Store — Store Listing (variante Element Picker)

> Texte zum Einfügen ins **CWS Developer Dashboard**.
> Privacy-URL, Permission-Justifications und Screenshots werden **im Dashboard** eingetragen,
> nicht im manifest. Privacy: https://www.getvariante.com/privacy

---

## Name (max. 75 Zeichen)
variante — A/B Test Element Picker

## Summary / Short description (max. 132 Zeichen — = manifest `description`)
Companion to the variante Figma plugin: pick an element on your live site as the target for an A/B test.

## Category
Developer Tools (alternativ: Workflow & Planning)

## Language
English

---

## Detailed description

**The companion picker for the variante Figma plugin.**

variante lets designers run A/B tests on their live website straight from Figma — no developer needed. This extension is the bridge: when you start a test in the plugin, your site opens with the picker active, you click the element you want to test, and the selection flows back into Figma.

### What it does
- **Highlights and selects** any element on your live page on hover-and-click.
- **Sends the selection** (a stable test ID) back to the variante plugin so you can build the variant.
- **Manual fallback popup** — paste a `testId` from the plugin if a page doesn't open automatically.

### What it does NOT do
- It does not read or collect your browsing history.
- It does not run on pages on its own — it acts only when you start a pick from the variante plugin (or the popup).
- It only touches the single element you click.

### You'll need
- The **variante Figma plugin** (search "variante" in Figma Community).
- A live website you're testing.

Privacy policy: https://www.getvariante.com/privacy

---

## Single purpose (Pflichtfeld im Dashboard — knapp halten)
Select an element on a live web page to use as the target for an A/B test created in the variante Figma plugin.

## Permission justifications (Pflicht im Dashboard)
- **`activeTab`** — Used only when the user starts a pick: lets the extension inject and run the element-picker overlay on the page the user is actively on. No background or cross-tab access.
- **`scripting`** — Required to inject the picker script (`content-picker.js`) on demand, instead of running it on every page load. The only permanent script (`content-hash.js`) is ~30 lines and only captures a URL hash.
- **`storage`** — Stores the current `testId` and the user's last entries locally so the picker can hand the selection back to the plugin. No personal data, local only.
- **Host permissions (`http://*/*`, `https://*/*`)** — The user tests their own site, whose URL isn't known in advance, so the picker must be available on any page the user chooses. It activates only on explicit user action. The only script that runs automatically on all pages (`content-hash.js`) is ~30 lines and only captures a URL hash from Figma's auto-open flow; the full picker (~270 lines) is loaded on demand via `scripting` API.

---

## Assets-Checklist — Ablage & Upload

| Asset | Format | Datei | Hochladen im Dashboard |
|---|---|---|---|
| **Store-Icon** | 128×128 PNG | `icons/icon128.png` | ✅ |
| **Screenshot(s)** | 1280×800 oder 640×400 PNG | `cws-assets/screenshot-1.png` | ✅ |
| **Promo-Tile** (optional) | 440×280 PNG | `cws-assets/promo-tile.png` | ✅ |
| **Privacy-URL** | — | https://www.getvariante.com/privacy | ✅ eintragen |
| **Data Usage** | — | — | Keine PII, keine Weitergabe/Verkauf |

> **Wichtig:** `cws-assets/` wird **nicht** mit ins ZIP gepackt. Screenshots lädt man direkt im Dashboard hoch.
