# Brand Guidelines — variante

> **v3** — Regelwerk, keine Historie (Pivot- und Migrationsgeschichte: `docs/historie.md`).
> Gilt für Web-Dashboard, Login/Signup, Landingpage und (eingeschränkt, §9) das Figma-Plugin.
> Tokens: `ab-tool/app/globals.css` (`:root` + `@theme`). Primitives: `ab-tool/app/components/`.
> **„TODO Phase 2"** = Komponente existiert, der Bestand nutzt sie noch nicht; bis dahin gilt die Regel, nicht der Ist-Code.
> Phase 1 (Primitives bauen) ist abgeschlossen — siehe `ab-tool/app/components/` und `index.ts`.

---

## 1. Produkt & Prinzipien

| Attribut | Wert |
|---|---|
| **Produkt** | variante — A/B-Tests für jede Website: Snippet `ab.js` einbinden, Element im Dashboard per Picker wählen, KI baut Variante B, variante misst. Kein Dev nötig. |
| **Schreibweise** | Eigene Flächen: „variante" (klein). Fremd-/Rechtsflächen (Stripe, Rechnung, Impressum): „Variante". |
| **Referenz-Struktur** | Vercel-Dashboard: Sidebar-Nav, Card-Grid, Toolbar-Pattern |
| **Farbwelt** | Monochrom (Panda = schwarz-weiß) + genau 3 Funktionsfarben. Kein Marken-Akzent. Dark-only. |
| **Design-Prinzip** | Technisch, dicht, strukturiert — man sieht sofort, wo man ist und was man tun kann. |
| **Free/Pro** | Eingeschränktes bleibt **sichtbar** und wird erklärt, nie versteckt (§7). |
| **Tonalität** | Direkt, dev-frei, „volle Kontrolle". UI-Texte Englisch. |

**Kernregeln (nicht verhandelbar):** monochrom · 3 Funktionsfarben · kein Shadow/Gradient/Blur/Glow ·
Gewichte nur 400/500/600 · Pro-Features sichtbar statt versteckt.

---

## 2. Farben

| Token (CSS) | Tailwind | Wert | Einsatz |
|---|---|---|---|
| `--color-bg-0` | `bg-bg-0` | `#000` | Seiten-Canvas, Sidebar, Drawer |
| `--color-bg-1` | `bg-bg-1` | `#0a0a0a` | Card-Fill, Inputs, Dropdown-Panel |
| `--color-bg-2` | `bg-bg-2` | `#111` | Nested Fill: aktiver Nav-Eintrag, Hover, neutrale Badge |
| `--color-border` | `border-border` | `white/10` | Standard-Hairline |
| `--color-border-strong` | `border-border-strong` | `white/18` | Hover, betonte Trennung, gesperrte Card |
| `--color-text` | `text-text` | `#ededed` | Primärtext, Werte |
| `--color-text-2` | `text-text-2` | `#ededed/62` | Sekundärtext |
| `--color-text-3` | `text-text-3` | `#ededed/58` | Meta, Placeholder, Hilfetext (AA-konform, ≥ 4.5:1) |
| `--color-fill-invert` (+`-hover`) | `bg-fill-invert` | `#fff` | Primär-Button |
| `--color-text-on-invert` | `text-text-on-invert` | `#000` | Text auf Primär-Button |
| `--color-ok` / `-bg` | `text-ok` / `bg-ok-bg` | `#2fd76c` | aktiv, live, Erfolg, Gewinner |
| `--color-pro` / `-bg` | `text-pro` / `bg-pro-bg` | `#f5a623` | Pro, gesperrt, Limit erreicht, Warnung |
| `--color-err` / `-bg` | `text-err` / `bg-err-bg` | `#f5455c` | Fehler, Verlierer, destruktiv |

- Keine weiteren Grautöne und keine vierte Funktionsfarbe. Neutral/Draft = `text-text-3` + `bg-bg-2`.
- Funktionsfarben nur für Bedeutung, nie Dekoration. Tönungen per Opacity-Modifier (`border-ok/20`) sind erlaubt.
- Tiefe entsteht nur über Hairline + Fill-Stufe (`bg-0 → bg-1 → bg-2`), nie über Schatten.

---

## 3. Typografie

**Font:** `--font-sans` (Inter-Stack), `--font-mono` (`font-mono`). Monospace **nur** für Maschinenwerte:
Kontingente (`8.2K / 10K`), IDs, URLs/Pfade, Snippet-Code, Token. Nie für Prosa oder Labels.
Ziffern im Dashboard sind global `tabular-nums` (`app/dashboard/layout.tsx`).

**Gewichte:** `font-normal` (400) Fließtext · `font-medium` (500) Labels, Nav aktiv, Kartentitel, Werte ·
`font-semibold` (600) Buttons, Badges, Überschriften. **Nie** `font-bold`/700+.

**Size-Skala Dashboard / Login** (Token → Klasse):

| Token | Klasse | Größe | Einsatz |
|---|---|---|---|
| `--text-meta` | `text-meta` | 11px | Meta, Section-Labels, Badges, Hilfe-/Fehlertext, Tabellen-Header |
| `--text-small` | `text-small` | 12px | Sekundäre Zeilen, Buttons `sm`/`md`, Tabellenzellen, Tooltips |
| `--text-body` | `text-body` | 13px | Standard (Body-Default im Dashboard-Layout), Nav, Inputs |
| `--text-title` | `text-title` | 15px | Card-/Drawer-/Dialog-Titel |
| `--text-heading` | `text-heading` | 18px | Seitentitel (H1) — genau einer pro Seite |
| `--text-display` | `text-display` | 24px | KPI-Werte |
| `--text-display-lg` | `text-display-lg` | 36px | Hero-Zahl der Results-Seite (Uplift), Error-Code |

10px und kleiner sind im Dashboard verboten (Ausnahme: Zähler-Bubble an Icon-Buttons, max. 1 Zeichen → `text-meta` reicht ebenfalls).
14px gibt es nicht; ehemalige 14px-Titel → `text-title`.

**Landingpage** nutzt Tailwind-Standardgrößen (`text-sm` … `text-5xl`) bzw. die `.hero-*`/`.section-*`-Klassen
in `globals.css`: Base 16px, Meta 13px, Hero 36–56px responsive, `leading-relaxed`. Gleiche Gewichte.

---

## 4. Radius, Spacing, Motion

### 4.1 Radius

| Token | Tailwind | Wert | Einsatz |
|---|---|---|---|
| `--radius-sm` | `rounded-sm` | 4px | Badges/Pills, Checkbox, kleine Inline-Controls |
| `--radius-md` | `rounded-md` | 6px | **Cards**, Buttons, Inputs, Icon-Buttons, Dropdown-Panels, Tooltips |
| `--radius-lg` | `rounded-lg` | 10px | nur Modal-Dialog (§6.6). Nicht für Cards. |
| — | `rounded-full` | 50% | Status-Dots, Avatare, Progress-Bars, Toggle-Switch |

Bestehende Schreibweise `rounded-[var(--radius-md)]` ist gleichwertig; neuer Code nutzt `rounded-md`.
Die Primitives (`Card`, `Skeleton`, `EmptyState`, `NotificationCenter`) sind auf `md` gezogen; verbleibende `--radius-lg` im Bestand fallen mit Phase 2.

### 4.2 Spacing (Layout-Abstände)

| Token | Tailwind | Wert | Einsatz |
|---|---|---|---|
| `--spacing-tight` | `gap-tight`, `p-tight` … | 4px | Icon↔Text, Label↔Wert in KPI |
| `--spacing-snug` | `gap-snug` … | 8px | Elemente in einer Zeile, Toolbar-Items |
| `--spacing-base` | `gap-base` … | 12px | Cards im Grid, Card-Inhalt vertikal |
| `--spacing-loose` | `gap-loose` … | 20px | Sections innerhalb einer Seite |
| `--spacing-section` | `mt-section` … | 32px | Seitenblöcke; Landing: Vielfache (64–120px) |

Namen bewusst nicht `xs…xl`: in Tailwind v4 löst `max-w-sm/md/lg` zuerst `--spacing-*` auf — `--spacing-md`
würde `max-w-md` auf 12px schrumpfen. Innenabstände von Controls (Button, Input, Badge) liegen in der Komponente
und dürfen Tailwinds 4px-Raster nutzen (`px-2.5`, `py-1.5`). **Keine** Arbitrary-Werte (`p-[7px]`).

### 4.3 Motion

`--duration-fast` 120ms (Farbe/Opacity, Default aller `transition-*`) · `--duration-base` 160ms (Flächen-Hover,
`.surface-interactive`) · `--duration-slow` 320ms (Progress, Drawer-Slide) · Easing `--ease-out`.
Kein Hover-Lift im Dashboard (`.card-lift` nur Landingpage). `prefers-reduced-motion` wird global respektiert.

---

## 5. Layout

### 5.1 App-Shell (Dashboard)

```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │ <main> einspaltig, max-w 1200px, Padding 24px │
│ 220px    │                                              │
│ Logo     │ Ebene 0–6 (§8.1)                              │
│ Overview │                                              │
│ Tests    │                                              │
│ ─────    │                                              │
│ Account  │                                              │
│ Billing  │                                              │
│ Docs ↗   │                                              │
│ Avatar   │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar: `app/dashboard/Sidebar.tsx`, 220px, `bg-bg-0`, `border-r border-border`. Keine Topbar ab `md`.
- Main: `app/dashboard/layout.tsx` → `md:pl-[220px]`, Body `text-body` (13px).
- Seitenkopf: `<PageHeader>` aus `app/components/PageHeader.tsx` (Titel `text-heading`, Breadcrumbs, Actions-Slot).

### 5.2 Responsive

| Breakpoint | Verhalten |
|---|---|
| `< md` (768px) | Sidebar ist Off-Canvas-Drawer (`-translate-x-full`), geöffnet über 48px-Topbar mit Menü-Button (`fixed top-0 h-12`), Backdrop `bg-black/60`, schließt bei Routenwechsel und `Esc`, Body-Scroll gesperrt. Main `pt-12`. |
| `≥ md` | Sidebar fix sichtbar, Main `md:pl-[220px] md:pt-0`. |
| KPI-Grid | `grid-cols-2` → `sm:grid-cols-3` → `xl:grid-cols-5` |
| Drawer | `< sm` volle Breite, `≥ sm` 50vw |
| Toolbar | Suche bricht über volle Breite um, Icon-Buttons + CTA in zweiter Zeile |

Touch-Targets auf Mobile ≥ 44px (Menü-/Close-Buttons `h-11 w-11`). Keine horizontale Seiten-Scrollbar;
Tabellen scrollen in ihrem Container (`overflow-x-auto`).

### 5.3 Landingpage & Login

Gleiche Tokens, mehr Luft: Section-Abstand 64–120px, Container `.container` (72rem). Feature-/Pricing-Cards
= Card aus §6.3, keine eigene Marketing-Palette. Landing-Buttons sind Pills (`.btn-primary`/`.btn-secondary`,
`rounded-full`) — einzige erlaubte Abweichung von §6.1.
Login/Signup: zentrierte Card auf `bg-bg-0`, ein Primär-Button, Sekundär-Links `text-text-2`.

---

## 6. Komponenten

### 6.1 Button → `<Button>` (`app/components/Button.tsx`)

| Pattern | Umsetzung |
|---|---|
| Primär (invertiert) | `<Button variant="primary">` — genau **einer** pro Screen/Section, CTA ganz rechts |
| Sekundär (outlined) | `<Button variant="secondary">` |
| Destruktiv | `<Button variant="danger">` |
| Ghost / Text-Aktion | `<Button variant="ghost">` |
| Link als Button | `<Button href="…">` |
| Icon-Button | `<Button size="icon">` (32px) bzw. `size="icon-lg"` (36px, Toolbar — auf Input-Höhe) |
| Text-Aktion im Satz | `<Button variant="link" size="inline">` — ohne Fläche, erbt Schriftgröße, Farbe und Gewicht der Zeile |

Größen: `sm` (`text-meta`), `md` (`text-small`, Default), `lg` (Landing/Onboarding). Icon links vom Label, `h-3.5 w-3.5`.
Varianten laufen über cva, Klassen-Merge über `cn()`. `disabled`/`loading` deaktivieren auch die `href`-Form (rendert `<span aria-disabled>` statt `<a>`).
**Phase 2:** 155 Stellen laufen über `<Button>`. Offen bleiben bewusst nur noch Optionskarten mit
eigener Innenstruktur (Goal-Typ in `ResultsClient.tsx`, Vorschlagsliste in `StepUrlAndElement.tsx`),
Farbfelder (`ColorPicker.tsx`) und die Avatar-Dropzone in `AccountClient.tsx` — das sind keine Buttons,
sondern eigene Muster. Ein `<OptionCard>`-Primitive wäre dafür der nächste Schritt.

### 6.2 Badge / Pill → `<Badge>` (`app/components/Badge.tsx`)

`<Badge tone="ok|pro|err|neutral" dot?>` — `text-meta`, `font-semibold`, `rounded-sm`, `px-1.5 py-0.5`.
Neutral `bg-bg-2 text-text-2`, sonst `bg-{tone}-bg text-{tone}`. Pro-Badge: Text `PRO`, uppercase.
Eine Größe (`text-meta`); die frühere `size="sm"` mit 9px ist entfallen, 10px und kleiner sind nach §3 verboten.

### 6.3 Card → `<Card>` (`app/components/Card.tsx`)

`bg-bg-1`, `border border-border`, `rounded-md`, Padding `p-4` (`padding="md"`). Klickbar → zusätzlich
`.surface-interactive` (Hover: `border-border-strong` + `bg-bg-2`). Kein Lift, kein Schatten.
Tones `ok/pro/err` nur für Banner/Hinweis-Cards (`variant="banner"`). `variant="dashed"` = Empty State/Drop-Zone.
`interactive` setzt `.surface-interactive`; `variant="lift"` ist entfallen. Restliche `div`-Props gehen durch (Live-Region, `onClick`).
`padding="none"` ist für Karten, die ihre Abschnitte selbst abpolstern (Listen mit Trennern).
**Phase 2:** 41 Flächen laufen über `<Card>`. Dabei sind 21 Karten von `p-5` und 3 von `p-6` auf den
hier festgelegten Default `p-4` gezogen worden — `p-5` war der häufigste Wert im Bestand und stand in
keiner Regel. `Skeleton.tsx` ist auf `rounded-md` nachgezogen, damit Lade- und Fertigzustand gleich aussehen.
Nicht umgestellt: `DecisionList.tsx` ist ein `<section aria-labelledby>` — die Semantik wiegt schwerer als
die gemeinsame Hülle.

### 6.4 Status-Indikator (Dot/Ring)

| Zustand | Darstellung |
|---|---|
| Aktiv/Live | gefüllter Kreis `bg-ok`, 6–8px, `rounded-full` |
| Draft/Neutral | gestrichelter Ring `border-text-3` |
| Pausiert | gefüllter Kreis `bg-text-3` |
| Fehler | gefüllter Kreis `bg-err` |

Gleiche Ikonografie in TestCard, DecisionList, Activity-Feed, Plugin: `<StatusDot status="live|draft|paused|error">`, mit `aria-label` aus dem Status.
**Phase 2:** `TestCard.tsx` nutzt `<StatusDot>` (Live-Puls und Status-Pille). Offen: Activity-Feed.

### 6.5 Formular-Felder

| Element | Regel |
|---|---|
| Input / Select / Textarea | `bg-bg-1 border border-border rounded-md px-3 py-2 text-body text-text placeholder:text-text-3`; Höhe 36px |
| Label | über dem Feld, `text-meta font-medium text-text-2`, Abstand Label→Input `gap-tight` (4px), für jedes Feld Pflicht (`<label htmlFor>`) |
| Hilfetext | unter dem Feld, `text-meta text-text-3`, Abstand `gap-tight` |
| Fehlertext | ersetzt den Hilfetext, `text-meta text-err`, Feld `border-err`, `aria-invalid` + `aria-describedby` |
| Feld↔Feld | `gap-base` (12px); Gruppen `gap-loose` |
| Checkbox / Toggle | Checkbox `rounded-sm`, Toggle `rounded-full` (`<Toggle checked onChange label>`); Label rechts, klickbar |
| Formular-Aktionen | rechtsbündig, Primär rechts außen, Sekundär links daneben |

`<Field label hint error>` erzeugt die IDs selbst; `<Input>`, `<Textarea>` und `<Select>` greifen `htmlFor`, `aria-describedby` und `aria-invalid` per Context ab — die Aufrufstelle verdrahtet nichts.
**Phase 2:** Login, Signup und Update-Password laufen über `<Field>`/`<Input>`; `<Toggle>` liegt jetzt in
`app/components/` statt lokal in `AccountClient.tsx`. Offen: die Felder im Dashboard (Suchfeld in
`TestsClient.tsx`, Wizard-Steps, `AccountClient.tsx`) — sie sind heute rohe `<input>` mit eigener
Fläche, aber bereits auf Tokens.

### 6.6 Drawer & Modal

- **Drawer** (Wizard, Detail-Panels): rechts, `bg-bg-0 border-l border-border`, `< sm` voll, `≥ sm` 50vw, `.animate-slide-in-right`,
  Backdrop `bg-black/60`. Kopf: Titel `text-title` + Close-Icon-Button; Fuß: Aktionen rechts, sticky.
  `role="dialog" aria-modal aria-labelledby`, Fokus-Trap, `Esc` schließt, Fokus kehrt zum Auslöser zurück.
  `<Drawer open onOpenChange title footer>` auf Radix Dialog: Fokus-Trap, `Esc`, Scroll-Lock und Fokus-Rückgabe kommen von dort.
  **TODO Phase 2:** `NewTestDrawer.tsx` darauf umstellen (nutzt noch eigenen Backdrop und `shadow-2xl`).
- **Modal** (nur Bestätigungen, max. 1 Frage): zentriert, `max-w-md`, `bg-bg-1 border border-border rounded-lg p-6`, gleiche a11y-Regeln.
  Nie als Upsell (§7). `<Modal>` und `<ConfirmDialog confirmLabel tone onConfirm>` liegen in `app/components/Modal.tsx`.

### 6.7 Tabs & Segmented Control

- **Tabs** (Seiten-Unterbereiche): Text-Tabs `text-body`, inaktiv `text-text-2`, aktiv `text-text font-medium` + 2px-Unterstrich `bg-text`,
  Leiste `border-b border-border`. `role="tablist"/"tab"`, `aria-selected`, Pfeiltasten. Aktuell nicht im Einsatz.
- **Segmented Control** (2–4 Optionen, z. B. Zeitraum 7/30/All, Preview A/B): Container `bg-bg-1 border border-border rounded-md p-0.5`,
  aktive Option `bg-bg-2 text-text`, sonst `text-text-3`; `aria-pressed`. Vorbilder: `PeriodSelector.tsx`, `new-test/PreviewStateToggle.tsx`.

`<Tabs>` liegt in `app/components/ui/tabs.tsx` (Radix: Rollen und Pfeiltasten), `<SegmentedControl label value onChange options>` in `app/components/`.
**Phase 2:** Acht Umschalter laufen über `<SegmentedControl>` — `PeriodSelector`, `PreviewBreakpoints`,
`TextInputEditor`, die Modus-Wahl in `StepGoal` und `StepUrlAndElement`, der Border-Style in `ChangeList`
und das Signifikanzniveau in `ResultsClient`. Sie zeigen den aktiven Zustand jetzt gleich
(`bg-bg-2 text-text` statt dreimal unterschiedlich).
`grow` verteilt die Optionen auf die volle Breite. Gesperrte Optionen tragen `aria-disabled` statt
`disabled`: so bleiben sie fokussierbar und zeigen ihren `<Tooltip>` — ein `disabled`-Button feuert in
Firefox kein `:hover`. Offen: `new-test/PreviewStateToggle.tsx`.

### 6.8 Dropdown / Menü

Auslöser = Icon-Button oder Sekundär-Button mit `ChevronDown`. Panel: `absolute z-50 bg-bg-1 border border-border rounded-md p-1`,
min. 180px breit, 4px Abstand zum Auslöser. Item: `px-2.5 py-1.5 text-body text-text-2 rounded-sm hover:bg-bg-2 hover:text-text`,
aktiv mit `Check`-Icon rechts. Gruppen-Label `text-meta text-text-3 uppercase`. Destruktives Item `text-err`, unten, abgetrennt.
`aria-haspopup`/`aria-expanded`, `role="menu"` bzw. `"listbox"`, `Esc` + Klick außerhalb schließen.
`<DropdownMenu>` in `app/components/ui/dropdown-menu.tsx` (Radix). Highlight hängt an `data-highlighted`, damit Maus und Tastatur denselben Zustand zeigen; `<DropdownMenuItem tone="danger">` für destruktive Einträge.
**Phase 2:** `FilterDropdown.tsx` läuft darüber — die drei Filter sind jetzt drei echte Radio-Gruppen
statt einer `role="listbox"` mit gemischtem Inhalt.

### 6.9 Tabellen

`w-full text-small`. Header: `text-meta font-medium text-text-3`, `border-b border-border`, `pb-2`. Zeilen: `border-b border-border`
(letzte ohne), `py-2`, Hover `bg-bg-2` nur wenn klickbar. Zahlen rechtsbündig + `tabular-nums`, IDs/URLs `font-mono`.
Container `overflow-x-auto`. Leere Tabelle → Empty State statt Kopfzeile ohne Inhalt.
`<TableWrap>`/`<Table>`/`<TableHead>`/`<TableRow interactive>`/`<TableHeaderCell numeric>`/`<TableCell numeric mono>` in `app/components/Table.tsx`.
**Phase 2:** Die Rohdaten-Tabelle in `ResultsClient.tsx` läuft darüber.

### 6.10 Tooltip → `<Tooltip>` (`app/components/Tooltip.tsx`)

Nur Zusatzinfo, nie einzige Quelle einer Aktion. `bg-bg-2 border border-border-strong rounded-md text-small`, Delay 300ms.
Zeigt sich auch bei Tastatur-Fokus (`group-focus-within`), nicht nur bei Hover.

### 6.11 Toast → `useToast()` (`app/components/Toast.tsx`)

Bestätigung nach Aktionen, unten rechts, auto-dismiss. Typen `success` (ok), `error` (err), `warning` (pro), `info` (neutral).
Fehler, die eine Handlung verlangen, gehören inline ans Feld/die Card, nicht in einen Toast.

### 6.12 Empty State → `<EmptyState>` (`app/components/EmptyState.tsx`)

Dashed Card, lucide-Icon in `bg-bg-2`-Kreis, Titel `text-body font-semibold`, ein Satz `text-small text-text-2`, eine Primär-Aktion.
**Leeres Dashboard:** „Create your first test" öffnet den Test-Wizard (`NewTestDrawer`): URL eingeben → Element per Picker wählen →
KI baut Variante B. Ist das Snippet noch nicht verifiziert, zeigt der Empty State zuerst den Snippet-Schritt (Ebene 1, §8.1).
`EmptyState` ist intern die Card aus §6.3 mit `variant="dashed"`.

### 6.13 Weitere vorhandene Primitives

`<PageHeader>` (Seitenkopf), `<Breadcrumbs>` (Unterseiten), `Skeleton*` (`Skeleton.tsx`, Loading-States in `loading.tsx`),
`<NotificationCenter>`, `<VariantPreview>` (iframe-Vorschau A/B), `useToast()` (§6.11). Charts: `recharts` über `app/components/ui/chart.tsx` + `chartTheme.ts`.

**Import:** alles aus `app/components/` über die Sammelstelle `app/components/index.ts`
(`import { Button, Card, Field, Input } from '@/app/components'`). Die Radix-basierten Bausteine
(`ui/dialog.tsx`, `ui/dropdown-menu.tsx`, `ui/tabs.tsx`) kommen aus `npx shadcn add`, sind auf unsere
Tokens gezogen und werden bewusst **nicht** re-exportiert, damit ein erneuter `shadcn add`-Lauf sie
überschreiben kann. `cn()` (`lib/utils.ts`) trennt per `extendTailwindMerge` Schriftgrößen- und
Farb-Tokens — ohne das verschluckt twMerge `text-meta` neben `text-ok`.

### 6.14 Usage/Quota-Zeile & Winner-Hinweis

- Quota: Label links (`text-text-2`), Wert rechts `font-mono`; bei Limit Wert `text-pro` (Limit = Upgrade-Anlass, kein Fehler).
  Free-Limits mit Progress-Bar `h-1 rounded-full bg-bg-2`, Füllung `bg-text`. Umsetzung: `PlanUsageBar` (DashboardClient).
- Gewinner: Zeile in der `DecisionList` mit `ok`-Dot, Testname, Uplift, „View →". Kein eigener Alert-Banner.

---

## 7. Zustände interaktiver Elemente

| Zustand | Regel |
|---|---|
| **Default** | wie Komponente definiert |
| **Hover** | Primär `bg-fill-invert-hover`; Sekundär/Inputs `border-border-strong` + `text-text`; Flächen `.surface-interactive`. Nur mit `@media (hover)`-sicheren Mitteln, kein Transform. |
| **Focus** | `:focus-visible` global (`globals.css`): 2px-Ring `white/40` mit 2px Abstand. Nie `outline-none` ohne Ersatz. Kein farbiger Ring. |
| **Active** | `active:scale-[0.98]` nur an Buttons |
| **Disabled** | `opacity-40` + `pointer-events-none`, `disabled`/`aria-disabled` setzen; Grund per Tooltip oder Hilfetext, wenn nicht offensichtlich |
| **Loading** | Button: `loading`-Prop (Spinner `Loader2` links, Label bleibt, Breite bleibt). Flächen: `Skeleton`, kein Spinner über ganzer Seite. |
| **Error** | Feld `border-err` + Fehlertext (§6.5); Card-Ebene `tone="err"`-Banner mit konkreter Handlung; nie nur Farbe ohne Text |
| **Selected/Active** | `bg-bg-2 text-text font-medium` (Nav, Segmente, Menü-Items) |
| **Gesperrt (Pro)** | §7.1 |

### 7.1 Free/Pro-Gating

1. **Nav:** gesperrter Eintrag bleibt, `text-text-3` + `Lock`-Icon rechts.
2. **Card:** bleibt an ihrer Position, `opacity-55 border-border-strong` + `<Badge tone="pro">PRO</Badge>` oben rechts + ein Satz Begründung `text-text-3` („Available on Pro").
3. **Aktion:** Upgrade-CTA ist ein permanent platzierter Button/Pill (Usage, Billing, Pricing) — nie Modal beim Klick.
4. **Nie:** Feature ausblenden, Upgrade-Hinweis ohne Kontext, Pop-up-Upsell.

---

## 8. Seiten-Struktur

### 8.1 Overview (`/dashboard`, `DashboardClient.tsx`)

Keine Toolbar — Suche/Sort/Filter wirken auf die volle Liste und liegen auf `/dashboard/tests`.

| Ebene | Inhalt | sichtbar |
|---|---|---|
| 0 | Kontextleiste: Scope-Selector („All domains"/Domain) + Test-Count + „New test" (Primär), Snippet-Status, Plan-Verbrauch (`PlanUsageBar`) | immer |
| 1 | Blocker — genau einer: Snippet-Banner *oder* Preview-Draft-Card | bis Snippet verifiziert |
| 2 | `DecisionList` „Needs your decision": max. 5 Zeilen + „more waiting" | wenn Entscheidungen offen |
| 3 | KPI-Grid, **5 Cards**: Active Tests, Visitors, Winning Tests, Avg Conv Rate, Avg Uplift. Label `text-meta text-text-3`, Wert `text-display font-semibold` | ab 1 Test |
| 4 | Trend-Chart (Zeitraum-Selector 7 / 30 / All time) | wenn Trenddaten |
| 5 | „Your tests": Top 5 nach Entscheidungsreife + „View all" | ab 1 Test, sonst Empty State |
| 6 | Agent-Panel „What to test next" | siehe `DashboardClient` |

Zeitraum steuert Visitors und Avg Conv Rate samt Δ zur Vorperiode; Tages-Zeiträume enden gestern (Cron schließt `daily_stats`
nachts ab), „All time" liest die Live-Zähler aus `tests`. Avg Uplift mittelt nur über Tests mit deklariertem Gewinner.

### 8.2 Tests (`/dashboard/tests`)

`<PageHeader>` + Toolbar über der ganzen Liste: `[Suche (flex-1)] [Sort] [Filter] [+ New test]`. Suche = Input (§6.5) mit
`Search`-Icon; Sort/Filter = Icon-Buttons + Dropdown (§6.8); CTA = Primär-Button rechts. Darunter Grid aus `TestCard`.

### 8.3 Test-Wizard (`NewTestDrawer` + `new-test/*`)

Drawer (§6.6), 4 Schritte: 1 Element (URL + Picker) → 2 Goal → 3 Variant (AI Generate / Manual) → 4 Review.
Schritt-Anzeige oben, Aktionen (Back / Continue bzw. Create test) im sticky Fuß. Draft wird gespeichert (`wizard_drafts`).

### 8.4 Results (`/dashboard/results/[id]`)

Hero-Zahl (Uplift) `text-display-lg`, Farbe nach Ergebnis (`ok`/`err`/neutral `text-text-3`), Signifikanz als Badge,
darunter Charts und Rohdaten-Tabelle (§6.9). Öffentliche Share-Variante `/results/[id]` nutzt dieselben Bausteine.

### 8.5 Account / Billing

`<PageHeader>` + Cards je Thema; Pro-Zeilen nach §7.1. Destruktive Aktionen (Konto löschen) unten, `variant="danger"` + Bestätigungs-Modal.

---

## 9. Figma-Plugin

Das Plugin läuft **in** Figma und sieht nativ aus, nicht nach Panda. Struktur: Stats-only, 320×360px, zwei Screens
(Connect, Stats), Test-Erstellung nur im Web-Dashboard.

- Farben/Buttons/Fokus: ausschließlich `--figma-color-*` (Light/Dark automatisch), kein eigener Akzent, keine Schatten.
- Mapping: `ok` → `--figma-color-{bg,text}-success`, `pro` → `…-warning`, `err` → `…-danger`; Fläche/Text/Border → `--figma-color-bg/-text/-border`.
- Übernommen aus Panda: Status-Dots (§6.4), Gating-Sprache (§7.1), Tonalität, Terminologie.
- Größen: Base 12px, Meta 11px, Titel 13px.

---

## 10. Icons

- **lucide-react**, ausschließlich. `currentColor`, Stroke-Default, nie gefüllt.
- Größen: `h-3.5 w-3.5` in Buttons/Badges, `h-4 w-4` Standard/Nav, `h-5 w-5` Mobile-Topbar, `h-6 w-6` Empty State.
- Icon-only-Buttons brauchen `aria-label`; dekorative Icons `aria-hidden="true"`.
- Keine Emojis als funktionale Icons. Ausnahme: Status-Dots (§6.4) sind gefüllte Kreise, keine Icons.

---

## 11. Anti-Patterns

| Nicht tun | Grund |
|---|---|
| Akzentfarbe (Violet/Fuchsia/Figma-Blue) | bricht die monochrome Identität |
| Gradient, Blur, Glow, Shadow, Hover-Lift im Dashboard | Tiefe nur über Border + Fill |
| Gesperrte Features ausblenden / Modal-Upsell | Upsell durch Sichtbarkeit |
| 700+ Gewicht | Hierarchie über 400/500/600 + Farbe |
| Vierte Funktionsfarbe | verwässert Bedeutung |
| Eigene Marketing-Palette | „gleiches System, mehr Luft" |
| Panda-Look im Figma-Plugin | Host-Kontext hat Vorrang |

---

## 12. Verboten im Code (Grundlage für ESLint, Phase 3)

Gilt für `ab-tool/app/**` und `ab-tool/components/**` (`*.tsx`). Ausnahme jeweils, wo genannt.

| # | Verboten | Stattdessen |
|---|---|---|
| 1 | `font-bold`, `font-extrabold`, `font-black` | `font-semibold` |
| 2 | `shadow-*` (außer `shadow-none`), `drop-shadow-*` | Border + Fill-Stufe |
| 3 | `bg-gradient-*`, `bg-linear-*`, `from-*`/`via-*`/`to-*`, `blur-*`, `backdrop-blur-*` | — |
| 4 | `text-[Npx]` / `text-[Nrem]` | `text-meta` … `text-display-lg`; Landing: Tailwind-Standardgrößen |
| 5 | `rounded-[Npx]`, `rounded-xl` … `rounded-3xl` | `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-full` |
| 6 | Arbitrary Spacing `p*-[Npx]`, `m*-[Npx]`, `gap*-[Npx]`, `space-*-[Npx]` | Spacing-Tokens (§4.2) oder 4px-Raster |
| 7 | Hex-/rgb-Farben in Klassen (`bg-[#…]`, `text-[rgb(…)]`) und Tailwind-Palettenfarben (`text-gray-*`, `bg-blue-*` …) | Farb-Tokens (§2) |
| 8 | Rohe `<button>` außerhalb `app/components/` | `<Button>` (Icon-Button nach Phase 1) |
| 9 | Rohe `<input>`, `<select>`, `<textarea>` außerhalb `app/components/` | `<Input>`/`<Select>`/`<Textarea>` (Phase 1) |
| 10 | `outline-none` ohne `focus-visible:`-Ersatz | globaler `:focus-visible`-Ring |
| 11 | Icons aus anderen Bibliotheken als `lucide-react` | lucide |

Ausnahmen: Landing-Grafiken in `ab-tool/components/` (Logo-SVGs dürfen Hex), `public/ab.js` und `figma-plugin/` (eigene Regeln, §9).
Regeln 8–9 sind ab sofort scharf: die Komponenten existieren (§6), der Bestand wird in Phase 2 nachgezogen.
