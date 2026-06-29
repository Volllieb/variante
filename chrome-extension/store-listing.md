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
- **`activeTab`** — Used only when the user clicks the popup to start a pick: injects the element-picker overlay into the active tab. No background or cross-tab access.
- **`scripting`** — Required to inject the picker script (`content-picker.js`) on demand. No content scripts are declared in the manifest — the picker is loaded only when the service worker detects `#ab_pick=` in a URL (auto-flow from Figma) or when the user clicks the popup. Nothing runs automatically on page loads.
- **`storage`** — Stores the current `testId` and user's last entries locally so the picker can hand the selection back to the plugin. No personal data, local only.
- **Host permissions (`http://*/*`, `https://*/*`)** — The user tests their own site, whose URL isn't known in advance, so the picker must be available on any page the user chooses. No content scripts run automatically — the host permissions are used exclusively for the service worker to inject the picker via the `scripting` API after detecting `#ab_pick=` in the URL (auto-flow) or after the user clicks the popup (`activeTab`).

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
