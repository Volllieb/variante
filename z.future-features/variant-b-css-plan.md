# `variant_b_css` — Layout & Position Testing

> Zweite Varianten-Achse: CSS-Injection statt DOM-Tausch. Für Reorder, Visibility, Spacing, Color — alles was kein neues HTML braucht.

---

## 1. Architektur-Entscheidung

**`variant_b_css` als parallele Spalte, nicht als neuer Test-Typ.**

| Dimension | Feld | Lieferung | Mechanismus |
|---|---|---|---|
| Content | `variant_b_html` | `replaceWith()` | DOM-Tausch (heute) |
| Layout | `variant_b_css` (neu) | `<style>` in `<head>` | CSS-Injection (neu) |

Beide Felder können parallel existieren. Ein Test kann Content+Layout kombinieren.

**Warum kein Enum/Test-Typ:** Der Designer soll nicht vordenken müssen ob's Content oder Layout ist. Die AI klassifiziert automatisch was sich geändert hat und befüllt das passende Feld. Der Wizard bleibt ein einziger Flow.

---

## 2. DB-Migration

```sql
ALTER TABLE tests ADD COLUMN variant_b_css TEXT;
```

Feld ist nullable, rückwärtskompatibel. Kein bestehender Test betroffen.

Zu patchende Felder in `PATCH /api/tests/[id]`:
- `variant_b_css` hinzufügen (same rules wie `variant_b_html`)

---

## 3. `ab.js` — Client-Änderungen

### 3.1 Neue Funktion `applyCss(key, css)`

```js
function applyCss(key, css) {
  if (!css) return
  var style = document.createElement('style')
  style.setAttribute('data-ab-css', key)
  style.textContent = css
  document.head.appendChild(style)
}
```

### 3.2 `applyTest(t)` erweitern

Read `t.variant_b_css`. Rufe `applyCss()` parallel zu `applyDom()` auf:

```js
function applyTest(t) {
  // ... existing logic ...

  function finish(variant, cachable) {
    if (variant === 'B') {
      // CSS zuerst (nicht vom Element abhängig), dann HTML
      applyCss(t.snippet_key, t.variant_b_css)
      applyDom(selector, variant, t.variant_b_html, t.snippet_key)
    }
    // ... goal registration unchanged ...
  }

  // force===B: CSS auch im Winner-Modus ausliefern
  if (t.force === 'B') {
    applyCss(t.snippet_key, t.variant_b_css)
    if (t.variant_b_html) applyDom(selector, 'B', t.variant_b_html, key)
    return Promise.resolve()
  }

  // Caching: variant_b_css muss mit im localStorage landen
  // ... existierende A/B-Logik, aber beim Cachen CSS mitspeichern ...
}
```

### 3.3 Caching im localStorage

Payload erweitern:

```js
lsSet('ab_' + key, JSON.stringify({
  variant: 'B',
  html: t.variant_b_html,
  css: t.variant_b_css     // ← neu
}))
```

### 3.4 `resolve` Endpoint

Query um `variant_b_css` erweitern:

```ts
// resolve/route.ts — select ergänzen
.select('snippet_key, selector, goal, status, site_url, winner, traffic_split, variant_b_html, variant_b_css, user_id')
```

Rückgabe-Objekt ergänzt um `variant_b_css`.

---

## 4. Figma Plugin — Wizard-Integration

### 4.1 Heutiger Flow (Content-Test)

```
Test Details (1/6) → Pick Element (2/6) → Variant B in Figma (3/6) → Generate (4/6) → Goal (5/6) → Review (6/6)
```

### 4.2 Erweiterter Flow für Layout-Tests

Die Erkennung passiert in **Step 2 (Pick Element)** automatisch:

**Neuer Button auf dem "Element captured"-Screen:**

```
┌─────────────────────────────────┐
│ ✓ Element captured              │
│ ┌─────────────────────────────┐ │
│ │ DIV  .hero-section          │ │
│ └─────────────────────────────┘ │
│ [Reselect]                      │
│                                 │
│ + Pick second element (reorder) │  ← NEU
│                                 │
│ [Continue to Variant B →]       │
└─────────────────────────────────┘
```

Der "+ Pick second element" Button öffnet den Picker erneut — aber diesmal im **Reorder-Modus**: Der Picker erkennt, dass ein zweites Element gepickt werden soll und markiert das erste visuell als "Element A".

### 4.3 Step 3 (Variant B in Figma) — adaptiv

**Wenn nur ein Element gepickt (Content-Test):** Unverändert. Designer redesigned in Figma.

**Wenn zwei Elemente gepickt (Layout-Test):**

```
┌─────────────────────────────────┐
│ Layout Test: Element Order      │
│                                 │
│ Element A: .hero-section        │
│ Element B: .calculator-section  │
│                                 │
│ Current order: A → B            │
│ New order:     B → A  ← AI      │
│                                 │
│ (Optional) Redesign elements    │
│ in Figma for combined test      │
│                                 │
│ [Skip to Generate →]            │
│ [Design in Figma →]             │
└─────────────────────────────────┘
```

Die AI erkennt aus beiden Element-Positionen die Parent-Beziehung und schlägt `order`/`flex-direction`-CSS vor. Der Designer kann das sofort akzeptieren ("Skip to Generate") oder Elemente zusätzlich in Figma redesignen ("Design in Figma").

**Entscheidend:** Der Figma-Design-Step wird *optional*, nicht *entfernt*. Der Designer kann:
1. Nur die Reihenfolge ändern (reiner CSS-Test)
2. Zusätzlich Elemente in Figma redesignen (kombinierter Test → HTML + CSS)

### 4.4 Step 4 (Generate) — adaptiver Prompt

Der Generate-Endpoint bekommt ein neues Feld `mode`:
- `"content"` (default) → wie heute, generiert `variant_b_html`
- `"reorder"` → generiert `variant_b_css` mit `order`/`flex-direction`/`grid-row`-CSS
- `"both"` → generiert beides

Die AI sieht beide Elemente + deren Figma-Redesign (falls vorhanden) und entscheidet eigenständig welche Felder befüllt werden.

### 4.5 Preview für CSS-Tests

Der Preview-Renderer im Generate-Screen kann kein CSS previewen (dafür bräuchte es den echten DOM). Stattdessen:

```
┌─────────────────────────────────┐
│ Generated CSS                   │
│ ┌─────────────────────────────┐ │
│ │ .hero-wrapper {             │ │
│ │   display: flex;            │ │
│ │   flex-direction: column;   │ │
│ │ }                           │ │
│ │ .hero-wrapper > :first-child│ │
│ │ { order: 2; }               │ │
│ │ .hero-wrapper > :last-child │ │
│ │ { order: 1; }               │ │
│ └─────────────────────────────┘ │
│ ✓ This CSS will be injected     │
│   without touching your DOM     │
│                                 │
│ [Refine with AI]                │
│ [Continue to Goal →]            │
└─────────────────────────────────┘
```

---

## 5. AI-Klassifizierung (Generate-Endpoint)

Der Generate-Endpoint (`/api/generate` oder vergleichbar) erkennt automatisch:

| Eingabe | Klassifizierung | Output |
|---|---|---|
| 1 Element + Figma-Redesign | Content | `variant_b_html` |
| 2 Elemente, selber Parent, keine Figma-Änderung | Reorder | `variant_b_css` |
| 2 Elemente, selber Parent, + Figma-Redesign | Combined | `variant_b_html` + `variant_b_css` |
| 2 Elemente, verschiedene Parents | DOM-Reorder (Phase 2) | `variant_b_html` (Parent-Tausch) |

---

## 6. Was bewusst *nicht* gemacht wird (Phase 2)

- **DOM-Reorder (`insertBefore`):** Zwei Elemente in verschiedenen Parents zu vertauschen erfordert physische DOM-Manipulation, die bei React-Hydration zerbricht. CSS kann das nicht. Für Phase 2, wenn Nachfrage da ist.
- **`variant_b_js`:** JS-Injection für Verhaltens-Tests (z.B. andere Animation, andere Interaktion). Braucht Content-Security-Policy-Überlegungen.
- **Multivariate Tests (C, D, ...):** Bleibt bei A/B. 95% der Use Cases sind A/B.

---

## 7. Implementierungs-Reihenfolge

| # | Schritt | Aufwand |
|---|---|---|
| 1 | DB-Migration `variant_b_css TEXT` | 5 min |
| 2 | `resolve` & `PATCH` Endpoints erweitern | 10 min |
| 3 | `ab.js`: `applyCss()`, Cache, `applyTest()` | 15 min |
| 4 | Figma Plugin: "+ Pick second element" Button | 20 min |
| 5 | Figma Plugin: "Reorder" Step 3 (optional Figma) | 15 min |
| 6 | Figma Plugin: CSS-Preview in Step 4 | 15 min |
| 7 | Generate-Endpoint: `mode`-Parameter + Prompt | 20 min |

**Total: ~100 min (2h)**

---

## 8. Offene Fragen

- **Picker-Modus "reorder":** Der Picker (`ab.js` picker mode) muss wissen dass er ein *zweites* Element pickt. Einfachster Weg: `?ab_pick=<testId>&ab_reorder=1` im URL-Parameter. Der Picker zeigt dann "Pick second element (ESC cancels)" als Banner und sendet beide Selektoren.
- **Element B als `selector_2` oder `reorder_target`?** Wahrscheinlich eigenes Feld `reorder_selector` in der Tests-Tabelle, damit der originale `selector` für A unverändert bleibt.
- **Was passiert wenn nur `variant_b_css` existiert, kein `variant_b_html`?** `applyDom()` wird nicht aufgerufen, `applyCss()` läuft alleine. Kein DOM-Touch, nur CSS. Perfekt.
