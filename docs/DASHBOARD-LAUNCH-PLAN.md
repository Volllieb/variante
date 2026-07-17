# Dashboard Launch-Readiness Plan

> Stand 17.07.2026 — Von MVP zu Launch-Qualität. Priorisiert nach Impact auf User-Experience & Conversion.

---

## 🎯 Ziel

Das Dashboard soll nicht mehr „funktionaler MVP" sein, sondern **Lauch-ready**: poliert, konsistent, schnell, barrierefrei, mit klarem Licht/Dunkel-Support und durchgängigen Loading-/Error-/Empty-States. Jeder Screen fühlt sich fertig an.

---

## 🔴 Critical (vor Launch zwingend)

### C1 — PandaLogo: voll rund, kein weißer Hintergrund ✅

**Status:** ✅ Done (18.07.2026). `PandaLogo.tsx`: size-prop (`'sm' | 'md' | 'lg'`), className optional. SVG: weiße Pfade auf transparentem Hintergrund. Alle 9 Call-Sites vereinheitlicht. `icon.svg` synchron. `rounded-full` entfernt (Panda-Kopf ist von Natur aus rund).

**Aufwand:** Klein | **Dateien:** `PandaLogo.tsx` + 9 Call-Sites + `icon.svg`

---

### C2 — Farbkonsistenz: Hardcoded Hex-Werte eliminieren

**Problem:** `TestsClient`, `SetupClient`, `BillingClient`, `AccountClient` verwenden alle ein lokales `T`-Objekt mit hartkodierten Hex-Farben (`#0a0a0a`, `#111111`, `#ededed`, …). Diese Seiten funktionieren nur im Dark-Mode.

**Fix:**
1. Alle inline-Hex-Farben durch Tailwind-Utility-Klassen ersetzen, die auf CSS-Variablen mappen: `bg-bg-1`, `bg-bg-2`, `text-text`, `text-text-2`, `text-text-3`, `border-border`, `border-border-strong`
2. Lokale `T`-Objekte entfernen
3. Funktionsfarben: `text-ok`, `text-pro`, `text-err`, `bg-ok-bg`, `bg-pro-bg`, `bg-err-bg`
4. Nach jedem File: Light-Mode manuell testen (Theme-Toggle temporär aktivieren oder `html.light`-Klasse im DevTools setzen)

**Aufwand:** Mittel (4 Files à ~100–500 Lines) | **Dateien:** `TestsClient.tsx`, `SetupClient.tsx`, `BillingClient.tsx`, `AccountClient.tsx`

---

### C3 — Theme-Toggle wieder einbauen ❌ (Won't Fix)

**Status:** ❌ Won't Fix (18.07.2026). Design-Entscheidung: Dark-only. `ThemeToggle.tsx` + `DashboardShell.tsx` gelöscht. Kein Light-Mode-Support geplant.

**Begründung:** Das Produkt ist ein Entwickler/Designer-Tool, keine Consumer-App. Dark-only unterstreicht die technische Positionierung und reduziert Maintenance. Alle Design-Tokens (`bg-0`, `bg-1`, `text`, etc.) sind auf Dark ausgelegt.

---

## 🟡 High (vor Launch empfohlen)

### H1 — Loading Skeletons in allen Client Components

**Problem:** `DashboardClient`, `TestsClient`, `SetupClient`, `BillingClient`, `AccountClient` haben KEINE eigenen Loading-Zustände. Nur `loading.tsx` auf Layout-Ebene — aber das wird nur beim initialen Seiten-Load gezeigt. Refresh, Filter-Wechsel, Tab-Wechsel haben keinen Spinner/Skeleton. Der User sieht kurz alte Daten oder gar nichts.

**Fix:**
1. `Skeleton.tsx`-Component existiert bereits (`app/components/Skeleton.tsx`). Prüfen ob sie gut genug ist.
2. In jede Client-Komponente: `loading`-State → wenn `true`, zeige Skeleton-Grid. Für DashboardClient: 5 KPI-Card-Skeletons + TestCard-Skeletons.
3. Refresh-Button: Spinner-Icon während `router.refresh()` oder `startTransition`.

**Aufwand:** Klein–Mittel | **Dateien:** 5 Client-Dateien + ggf. `Skeleton.tsx`

---

### H2 — Error Boundaries & Error States

**Problem:** Keine der Client-Seiten hat ein Error Boundary. Wenn eine API-Antwort unerwartet fehlschlägt, crasht die gesamte Seite. `BillingClient` nutzt sogar `alert()` für Errors.

**Fix:**
1. Reusable `<DashboardError>`-Komponente bauen: Icon + Titel + Beschreibung + Retry-Button. Nutzt Design-Tokens.
2. In jede Client-Komponente: `try/catch` um API-Calls, zeige `<DashboardError>` im Fehlerfall.
3. `BillingClient`: `alert()`-Calls durch Inline-Error-Banner ersetzen (analog `AccountClient`).
4. `ErrorBoundary`-Wrapper (existiert schon für TestCards in DashboardClient) auf alle Seiten ausweiten.

**Aufwand:** Mittel | **Dateien:** Neue Komponente + 5 Client-Dateien

---

### H3 — Empty States vereinheitlichen

**Problem:** Jede Seite hat ihren eigenen Empty-State-Style. Mal mit Icon, mal ohne, mal mit CTA-Button, mal nur Text.

**Fix:**
1. `EmptyState.tsx`-Component ausbauen: Props `icon`, `title`, `description`, `action` (optionaler Button). Nutzt Design-Tokens.
2. Alle Empty-States durch diese Komponente ersetzen.
3. Varianten: „No tests yet", „No results match your search", „No domains verified", etc.

**Aufwand:** Klein | **Dateien:** `EmptyState.tsx` + 3–4 Client-Dateien

---

### H4 — Setup-Link in der Sidebar

**Problem:** Die Sidebar hat „Settings" mit Billing & Account, aber keinen „Setup"-Eintrag. Der Setup-Guide (Domain-Verifikation, Snippet-Installation, Figma-Plugin-Token) ist nur über Umwege erreichbar. `DashboardShell.tsx` hatte ihn als Top-Level-Nav.

**Fix:**
1. „Setup" als weiteres Sub-Item unter „Settings" einfügen (neben Billing, Account)
2. Oder als eigenen Top-Level-Nav-Eintrag mit Icon (`Wrench`/`Zap`)
3. Route `/dashboard/setup` existiert bereits

**Aufwand:** Trivial | **Dateien:** `Sidebar.tsx`

---

## 🟢 Medium (Launch-Polish)

### M1 — Scope-Selector für Multi-Domain

**Problem:** Der Plan unterstützt bereits Multi-Domain (Free=1, Pro=5, Agency=100). Aber im Dashboard gibt es keinen Domain-Switcher. `DashboardClient` zeigt nur `primaryDomain` als statischen Titel.

**Fix:**
1. Dropdown-Komponente: „All sites" oder Domain-Name + Test-Count + „New test"-CTA
2. URLs: `/dashboard?domain=example.com` → filtert KPI-Stats & Test-Liste nach Domain
3. Free-Plan: Dropdown disabled mit Upsell-Tooltip

**Aufwand:** Mittel | **Dateien:** `DashboardClient.tsx`, `Sidebar.tsx` (Plan-Badge-Logik), neue `ScopeSelector.tsx`

---

### M2 — TestCard Actions: Pause / Archive / Duplicate

**Problem:** TestCards zeigen Daten, aber haben keine Actions. User kann Tests nicht pausieren, archivieren oder duplizieren. Nur „View results" als Link.

**Fix:**
1. `TestCard`-Hover: 3-Dot-Menu (Pause/Resume, Duplicate, Archive, Delete)
2. API-Routen dafür existieren teilweise: `PATCH /api/tests/[id]` (Status-Update), `POST /api/tests` (Duplicate = neuer Test mit gleichem variant_b)
3. Confirm-Dialog für Delete

**Aufwand:** Mittel | **Dateien:** `TestCard.tsx`, `DashboardClient.tsx`, ggf. neue Kontext-Menü-Komponente

---

### M3 — Accessibility-Pass

**Problem:** Keine `aria-label`s auf interaktiven Elementen, keine Fokus-Indikatoren, Sidebar-Logo hat leeres `alt`, Avatar hat `role="presentation"` (sollte Email anzeigen), kein Keyboard-Nav für Kollapsible Settings.

**Fix:**
1. Alle interaktiven Elemente: `aria-label` hinzufügen
2. `PandaLogo`: `alt="variante"` statt `alt=""`
3. Sidebar-Avatar: `alt={email}` + `role` entfernen
4. Settings-Toggle: `aria-expanded={settingsOpen}` + `aria-controls="settings-menu"`
5. `id="settings-menu"` auf dem expandierten Container
6. Fokus-Styles: `focus-visible:ring-1 focus-visible:ring-border-strong` auf allen interaktiven Elementen

**Aufwand:** Klein | **Dateien:** `Sidebar.tsx`, `PandaLogo.tsx`, alle Client-Seiten

---

### M4 — Avatar-Hash korrigieren

**Problem:** Der Gravatar-Hash in `Sidebar.tsx` ist KEIN MD5, sondern ein einfacher Integer-Hash. Echte Gravatar-Bilder werden nie matchen. Für `?d=404`-Fallback funktioniert das als zufällige Farbe, aber es ist inkorrekt.

**Fix:**
1. `crypto.subtle.digest('SHA-256', email)` → Hex, oder eine echte MD5-Bibliothek
2. Oder: ganz auf Gravatar verzichten und nur die farbigen Initialen zeigen (bis User ein Profilbild hochladen können)
3. Entscheidung: Gravatar ist Overkill für Launch → nur Initialen-Avatar

**Aufwand:** Trivial | **Dateien:** `Sidebar.tsx`

---

## 🔵 Low (Launch-Nice-to-Have)

### L1 — Responsive Sidebar (Mobile)

**Problem:** Sidebar ist immer 220px fixed. Auf Mobile (≤768px) kein Hamburger-Menü, keine Collapse-Option.

**Fix:**
1. `useState` für `mobileOpen` + Hamburger-Button (nur auf `<md` sichtbar)
2. Sidebar wird Overlay (nicht fixed daneben) auf Mobile
3. `main`-Padding nur auf `md:` anwenden (`md:pl-[220px]`)

**Aufwand:** Klein | **Dateien:** `Sidebar.tsx`, `layout.tsx`

---

### L2 — Gravatar / Profilbild-Upload

**Problem:** Kein Profilbild außer Gravatar-Fallback. Für ein Launch-Produkt fehlt Personalisierung.

**Fix:**
1. Avatar-Upload in `AccountClient.tsx`
2. Supabase Storage Bucket `avatars`
3. RLS: User kann nur eigenes Avatar lesen/schreiben

**Aufwand:** Mittel | **Dateien:** `AccountClient.tsx`, neue Migration, Storage-Bucket

---

### L3 — Billing: Preis anzeigen, Downgrade-Flow

**Problem:** Upgrade-Button zeigt keinen Preis. Kein Downgrade/Cancel-Flow (nur externer Stripe-Link).

**Fix:**
1. Preis in `BillingClient.tsx` anzeigen: „Upgrade to Pro — 35 €/Monat"
2. Cancel-Button mit Confirm-Dialog → ruft Stripe Portal auf
3. Invoice-History-Link zum Stripe Portal (bereits möglich, nur nicht verlinkt)

**Aufwand:** Klein | **Dateien:** `BillingClient.tsx`

---

### L4 — API Token Management in Account

**Problem:** API-Token wird nur in SetupClient gezeigt. Account-Seite hat kein Token-Management.

**Fix:**
1. Token-Sektion in `AccountClient.tsx`: Token anzeigen, Copy-Button, Regenerate-Button mit Confirm
2. API-Route existiert bereits: `/api/token`, `/api/token/regenerate`

**Aufwand:** Klein | **Dateien:** `AccountClient.tsx`

---

### L5 — SetupClient: „Copy prompt for AI" immer sichtbar

**Problem:** Der „Copy prompt for AI coding agent"-Button ist nur im `not-found`-Phase sichtbar. User, die das Snippet proaktiv einbauen wollen, finden ihn nicht.

**Fix:**
1. Nach der Domain-URL-Eingabe: Framework-Auswahl + Snippet + „Copy prompt for AI"-Button immer anzeigen (nicht nur bei `not-found`)
2. Varianten: „I'll install it myself" (zeigt Snippet + Prompt) vs „Auto-check" (aktueller Flow)

**Aufwand:** Klein | **Dateien:** `SetupClient.tsx`

---

## ❌ Dead Code (aufgeräumt)

| Datei | Status | Aktion |
|---|---|---|
| `DashboardShell.tsx` | Gelöscht (17.07.) | ✅ |
| `ThemeToggle.tsx` | Gelöscht (18.07.) | ✅ Dark-only |
| `LangToggle.tsx` | Gelöscht (18.07.) | ✅ Sprache automatisch via detectLang |
| `HeroAnimation.tsx` + `.module.css` | Gelöscht (18.07.) | ✅ Landingpage nutzt iframe, kein TSX-Import |
| `AIWorkflowAnimation.tsx` + `.module.css` | Gelöscht (18.07.) | ✅ Gleicher Grund |
| `NewTestFlow.tsx` | Gelöscht (18.07.) | ✅ Ersetzt durch TestCreationPanel (FigmaHelper + SnippetHelper) |
| `ab-tool/app/dashboard/DashboardClient.tsx` — `billing()` Funktion | Definiert, aber nie aufgerufen | **Löschen** |
| `ab-tool/app/dashboard/DashboardClient.tsx` — `userId` Prop | Akzeptiert, aber ungenutzt | Entweder nutzen oder aus Props entfernen |

---

## 📋 Umsetzungsreihenfolge

```
Phase 1 (heute): C1 PandaLogo + C3 ThemeToggle + Dead Code
    ↳ Basis: visuelle Konsistenz & Theme-Support wieder herstellen

Phase 2: C2 Farbkonsistenz (4 Files)
    ↳ Light-Mode funktioniert auf allen Seiten

Phase 3: H1 Loading Skeletons + H2 Error States + H3 Empty States
    ↳ Alle UX-Zustände abgedeckt — fühlt sich nicht mehr nach MVP an

Phase 4: H4 Setup-Link + M1–M4 (Accessibility, Avatar, TestCard Actions, Scope-Selector)
    ↳ Finaler Polishing-Durchlauf

Phase 5: L1–L5 (Responsive, Billing, Token, Profilbild, Setup-Prompt)
    ↳ Launch-Nice-to-Have — wenn Zeit übrig, sonst nach Launch
```

---

## 📊 Zusammenfassung

| Kategorie | Items | Aufwand |
|---|---|---|
| 🔴 Critical | 3 | 1 Tag |
| 🟡 High | 4 | 1–2 Tage |
| 🟢 Medium | 4 | 1–2 Tage |
| 🔵 Low | 5 | 1–2 Tage |
| ❌ Dead Code | 4 | <1h |
| **Gesamt** | **20** | **~1 Woche** |
