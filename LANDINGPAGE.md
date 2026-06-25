# LANDINGPAGE.md — getvariante.com

> **Status:** Spezifikation für den One-Shot-Prompt. Stand 25.06.2026.
> **Ziel:** Seite, die Designer in <5s erklärt, was variante tut → Figma-Plugin-Install.

---

## 1. Technische Basis

| Feld | Wert |
|---|---|
| **Framework** | Next.js 16 (App Router) — **statisch** (`force-static`) |
| **CSS** | Tailwind — kein CSS-in-JS, kein Framework |
| **Client-JS** | **Kein** React-Hydration-Code, kein `useEffect`, kein `useState` |
| **Formular** | Wenn Waitlist/Notify: statisches Formular → `POST /api/waitlist` |
| **Screenshots** | Platzhalter-GIF (`/placeholder-demo.gif`) bis echte Aufnahme da ist |
| **Font** | Tailwind-Standard (`system-ui, sans-serif`) — kein Google-Font-Load |
| **Sprache** | Englisch |
| **Badge** | Kein "Powered by variante"-Badge auf der Landing |

## 2. Stil & Farbschema

**Bunt/verspielt** — kein graues B2B-SaaS.

| Rolle | Farbe | Tailwind |
|---|---|---|
| Hintergrund | Sehr helles Violett-Grau | `bg-violet-50` |
| Primary (CTA, Links) | Violett | `bg-violet-600`, `hover:bg-violet-700` |
| Secondary (Badges, Akzente) | Orange/Rose | `bg-amber-100`, `bg-rose-100` |
| Text primär | Fast-Schwarz | `text-gray-900` |
| Text sekundär | Mittelgrau | `text-gray-500` |
| Karten-Hintergrund | Weiß | `bg-white` |
| Border | Hellgrau | `border-gray-200` |

**Shape Language:**
- Volle `border-2` mit abgerundeten Ecken (`rounded-xl`/`rounded-2xl`)
- Cards mit leichtem Schatten (`shadow-sm`, `hover:shadow-md`)
- Verlaufselemente sparsam (z.B. Hero-Gradient als Hintergrund)

## 3. Seitenstruktur (5 Sektionen, single-page)

### 3.1 Header (klebend, schmal)

```
[Logo: "variante" in bold violet]      [Log in] [Sign up – free]
```

- Transparenter/weißer Hintergrund, schmal (`py-3`, `px-6`)
- "Log in" → `/login` · "Sign up – free" → `/signup`
- Sticky bei Scroll (`sticky top-0 z-50`)

### 3.2 Hero — der Kern

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│         ✦ A/B testing from Figma — no dev needed            │
│                                                              │
│   Pick an element on your live site, describe the change     │
│   in Figma, AI generates Variant B. One snippet tracks       │
│   conversions. That's it.                                    │
│                                                              │
│   [Install Figma Plugin →]  [Create free account]           │
│                                                              │
│   ✦ Join 300+ designers already testing                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Headline:** max. 6 Wörter (oben: `A/B testing from Figma — no dev needed`)
- **Subline:** 2-3 Sätze, konkret. Kein Marketing-Blabla.
- **CTA primär:** `[Install Figma Plugin →]` — Button (violet-600, white text, `rounded-xl`, `font-semibold`)
  - Klick: öffnet Figma Community (wenn live) sonst → `/#notify` (Coming-soon-Hinweis)
- **CTA sekundär:** `[Create free account]` — outlined Button → `/signup`
- **Social Proof:** `✦ Join 300+ designers already testing` — klein unter Buttons
- Layout: Zentriert (`max-w-2xl mx-auto text-center`), viel vertikaler Raum (`py-24`)
- Hintergrund: Subtiler Gradient oder dekoratives Hintergrund-Element (SVG-Circles/Blobs)

### 3.3 How It Works — 3 Schritte

```
┌───────┐   ┌───────┐   ┌───────┐
│  ①    │   │  ②    │   │  ③    │
│ Pick  │→→→│Generate│→→→│ Ship  │
│       │   │       │   │       │
│ Click │   │ AI    │   │ One   │
│ element│  │ builds│   │ snippet│
│ on    │   │ Vari- │   │ in    │
│ your  │   │ ant B │   │ <head>│
│ site  │   │       │   │       │
│       │   │       │   │       │
│[GIF]  │   │[GIF]  │   │[GIF]  │
└───────┘   └───────┘   └───────┘
```

- 3 Spalten auf Desktop, 1 Spalte auf Mobile
- Jeder Schritt: Überschrift (fett), 1-2 Sätze, Platzhalter für GIF
- GIF-Platzhalter: graue Box mit `🎥 Demo recording` Text — wird später ersetzt
- Pfeil-Elemente zwischen den Schritten auf Desktop

**Schritt-Texte:**
- **① Pick** — "Choose any element on your live website. Hover, click, done. The picker captures the HTML, CSS, and page framework automatically."
- **② Generate** — "Switch to Figma, select the replacement design. AI analyzes both and writes Variant B — preserving your site's styling."
- **③ Ship** — "Copy one snippet into `<head>`. It serves the right variant and tracks conversions. No deploy pipeline, no dev."

### 3.4 Use Cases — 3 Kacheln

```
For whom is this?

┌─────────────────────┬──────────────────────┬─────────────────────┐
│  🎨 Designer        │  🏢 Agency            │  🚀 Solo Founder   │
│                     │                      │                     │
│  Building sites     │  Running multiple     │  No developer in   │
│  with AI (Bolt,     │  client sites from   │  the team → run    │
│  v0, etc.) and      │  AI exports → white- │  A/B tests in 10   │
│  need A/B testing   │  label for clients   │  minutes yourself  │
│  without a dev.     │  without extra cost.  │                     │
│                     │                      │                     │
│  → More conversions │  → More client value │  → Ship with        │
│  on your exports    │  on every project     │  confidence        │
└─────────────────────┴──────────────────────┴─────────────────────┘
```

- Drei Kacheln nebeneinander (Desktop), gestapelt (Mobile)
- Jede: Emoji-Icon, Titel, 2 Sätze, "→ Outcome"-Zeile
- Karten-Stil: weiß, border, shadow-sm, hover shadow

### 3.5 Pricing — 3 Tiers

```
Pricing
Simple, transparent. Start free, upgrade when you need more.

┌────────────┬────────────┬──────────────┐
│   Free     │   Pro      │   Agency     │
│────────────│────────────│──────────────│
│   $0       │   $35/mo   │   $99/mo     │
│────────────│────────────│──────────────│
│ 1 active   │ Unlimited  │ Unlimited    │
│ experiment │ experiments│ experiments  │
│ Badge ON   │ Badge OFF  │ Badge OFF    │
│            │            │ White-label  │
│            │            │ Multi-site   │
│            │            │ Team seats   │
│────────────│────────────│──────────────│
│ [Install]  │ [Start     │ [Contact]   │
│            │  free trial]│             │
└────────────┴────────────┴──────────────┘
```

- 3 Spalten, Free hervorgehoben oder Pro als "Recommended"-Tag
- Feature-Check pro Tier aufgelistet
- CTA: Free → Figma Plugin, Pro → Signup, Agency → `mailto:hello@getvariante.com`
- Hintergrund: gleicher heller violet wie Seite

### 3.6 Footer — minimal

```
variante — A/B testing from Figma. Made in Bavaria.
© 2026 · Privacy · Imprint
```

- `py-8`, heller Hintergrund (`bg-gray-50` oder `bg-violet-100/30`)
- Privacy → `/privacy` · Imprint → `/imprint`
- Kein Newsletters, keine Icons, kein Social-Media-Links

## 4. Coming-Soon-Handling (Plugin noch nicht im Store)

Da das Figma-Plugin noch **nicht** im Store ist:
- Der "Install Figma Plugin"-Button scrollt zu einer `#notify`-Section (oder öffnet ein Modal)
- Dort: "The plugin is in review. Leave your email and we'll notify you when it's live."
- Einfaches Formular: Email-Input + Submit → `POST /api/waitlist`
  - Speichert in Supabase (neue `waitlist`-Tabelle) oder Mailchimp-API
  - Antwort 200 → "Thanks! We'll email you."
- Falls kein Backend gewünscht: `mailto:hello@getvariante.com?subject=Notify me when Figma plugin is live`

**Nach Store-Zulassung:** Button verlinkt direkt zur Figma-Community-Seite, `#notify` wird entfernt.

## 5. Zu erstellende Dateien

```
ab-tool/app/
  page.tsx                     ← Komplette Landing (5 Sektionen, ~250 Zeilen)
  privacy/page.tsx             ← Privacy Policy (Store-Pflicht)
  imprint/page.tsx             ← Impressum (DE-Pflicht)
  api/waitlist/route.ts        ← (optional) Email-Sammler
```

Aktueller `page.tsx` (~15 Zeilen) wird ersetzt. `globals.css` bleibt `@import "tailwindcss";`.

## 6. SEO

```ts
// in layout.tsx oder page.tsx
export const metadata = {
  title: 'Variante — A/B Testing from Figma, No Dev Needed',
  description: 'Pick an element on your live site, describe the change in Figma, AI generates Variant B. One snippet tracks conversions.',
  openGraph: {
    title: 'Variante — A/B Testing from Figma',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
  }
}
```

- Kein dynamisches OG-Bild (statisch reicht für MVP)
- Canonical: `https://www.getvariante.com`

## 7. Nicht enthalten (später)

- Blog / Case-Studies
- Animierte Scroll-Übergänge (Intersection Observer)
- Cookie-Consent-Banner (keine Cookies)
- Analytics-Snippet (erst wenn Traffic da ist)
- Intercom/Intercom-Bubble

---

*Spezifikation Ende — bereit für den One-Shot-Prompt.*
