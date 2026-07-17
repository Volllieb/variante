# Self-Improving Site Engine — Feature Design

> Stand: 17.07.2026 (ursprünglich 10.07.2026). **🟡 Teilweise implementiert.**
> **Kernidee:** variante analysiert deine Site und sagt dir, was du als nächstes bauen/testen sollst. Nach jedem abgeschlossenen Test lernt das System dazu — die Site verbessert sich selbst.
>
> ### Was schon lebt (seit 13.–14.07.2026)
>
> | Komponente | Status | Details |
> |---|---|---|
> | **CRO-Analyse** (`lib/croAnalyze.ts`) | ✅ Live | `stripForCRO()`, `extractStructure()`, `analyzePage()`, 7 CRO-Kriterien |
> | **Suggestions-API** (`POST /api/suggestions`) | ✅ Live | Pro-gated, GPT-4o-mini, 4 page-spezifische Vorschläge |
> | **WhatToTestNext-UI** | ✅ Live | 3 Zustände: versteckt → Paywall (Free) → Vorschläge (Pro) |
> | **Autonomous Agent** (`POST /api/agent`) | ✅ Live | `streamText()` mit 4 Tools, `AgentPanel.tsx` Streaming-UI |
> | **site_insights-Tabelle** (Migration 019) | ✅ Live | `agent_runs` + `site_insights` deployed |
> | **Heuristik-Matrix (v1)** | ⬜ Offen | `lib/croHeuristics.ts` existiert, aber nicht in Agent eingebunden |
> | **Learning Loop (v3)** | ⬜ Offen | site_insights hat Schema, aber Feedback aus Testergebnissen fehlt |
>
> ### Was noch fehlt für den geschlossenen Loop
>
> - **v1 Heuristiken** in Agent-Pipeline integrieren (10 Heuristiken, DOM-Parse, $0 Kosten)
> - **v3 Learning Loop**: Ergebnisse abgeschlossener Tests → Prompt-Kontext für nächste Analyse
> - **Auto-Trigger**: Nach Winner-Detection automatisch nächsten Scan vorschlagen
> - **Figma-Plugin-Integration**: "What to test next" im Plugin-Wizard

---

## 1. Vision

**„Your site that optimizes itself."**

Heute: Designer installiert variante → baut manuell einen Test → wartet auf Ergebnisse → macht... nichts. Kein nächster Schritt. Das Tool ist passiv.

Morgen: Designer installiert variante → variante scannt die Site → sagt: **„Deine größte Conversion-Chance ist X. Soll ich den Test für dich vorbereiten?"** → Test läuft → Winner detected → variante sagt: **„+14% mit Variante B. Dein nächstes Ziel: Y."**

Der Loop schließt sich. Die Site wird besser, ohne dass der Designer ein Analytics-Dashboard öffnen muss.

## 2. Nutzer-Perspektive

### 2.1 Happy Path

```
1. Designer installiert ab.js auf landingpage.com
2. Dashboard: "Analyzing your site..."
3. 15 Sekunden später:
   ┌─────────────────────────────────────────────┐
   │ 🎯 Your Top 3 Opportunities                  │
   │                                               │
   │ #1 CTA above fold                             │
   │     Your CTA "Get started" is below the fold  │
   │     on mobile. Moving it up typically lifts   │
   │     signups 12-18%.                           │
   │     [Create this test →]                      │
   │                                               │
   │ #2 Social proof position                      │
   │     0 testimonials detected. Adding 3 above   │
   │     the CTA lifts trust +8-15%.               │
   │     [Create this test →]                      │
   │                                               │
   │ #3 Headline clarity                           │
   │     Your headline focuses on features, not    │
   │     benefits. Benefit-first headlines see     │
   │     +5-10% engagement.                        │
   │     [Create this test →]                      │
   └─────────────────────────────────────────────┘
4. Designer klickt "#1 CTA above fold" → Figma-Plugin öffnet mit vorgefülltem Test
5. Test läuft, Winner detected (+14%)
6. Dashboard: "CTA won. Your next biggest opportunity: #2 Social proof. Continue?"
```

### 2.2 Der geschlossene Loop

```
Site scannen  →  Top-3-Chancen  →  Test bauen  →  Test läuft
     ↑                                                  ↓
     │                                                  ↓
     └── Neue Top-3 (basierend auf letzten Ergebnissen) ←── Winner detected
```

## 3. Architektur

### 3.1 Phasen

| Phase | Name | Was es macht | Tech |
|---|---|---|---|
| **v1** | Rule-Based Audit | Seite fetchen, DOM parsen, gegen CRO-Heuristiken prüfen | Server-seitiger Fetch + Cheerio/DOMParser |
| **v2** | AI-Powered Audit | Seiten-Struktur + Text an GPT-4o, prompt: "Du bist CRO-Experte. Analysiere diese Landingpage und schlag die 3 wirkungsvollsten A/B-Tests vor." | OpenAI API, ~500 tokens/Call |
| **v3** | Learning Loop | Ergebnisse abgeschlossener Tests fließen in nächste Analyse ein. System lernt: "CTA-Änderungen wirken auf dieser Site besser als Headline-Änderungen." | DB-Tabelle `site_insights`, Kontext im Prompt |

### 3.2 v1: Rule-Based Heuristics (Quick Win, 1–2 Tage)

**Server-seitiger Fetch der User-Site → DOM-Analyse → Heuristik-Matrix:**

| Heuristik | Was geprüft wird | Grenzwert | Impact-Prognose |
|---|---|---|---|
| **CTA above fold (mobile)** | CTA-Element Y-Position in 375×812 Viewport | `< 600px` | 12–18% |
| **Social proof count** | Anzahl Testimonial-/Logo-/Kunden-Elemente | `>= 3` | 8–15% |
| **Trust signals** | Garantie-Badge, Security-Icon, „X+ customers" | `>= 1` | 5–10% |
| **Form field count** | Anzahl Input-Felder in `<form>` | `<= 5` | 10–20% (pro Feld) |
| **Headline type** | Benefit vs Feature (Keyword-Heuristik) | Benefit-Wörter > 2 | 5–10% |
| **CTA contrast ratio** | CTA-Button Farbe vs Hintergrund | `>= 4.5:1` | 3–8% |
| **Urgency element** | „Limited", „Only X left", Countdown-Timer | `>= 1` | 5–15% |
| **Mobile responsiveness** | Viewport-Meta, Media-Queries, Text-Größe >14px | Alle 3 erfüllt | 5–10% |
| **Navigation simplicity** | Anzahl Nav-Items | `<= 6` | 3–7% |
| **Visual hierarchy** | H1 existiert, max 1 H1, H2 folgt H1 | Alle 3 erfüllt | 3–5% |

**Output:** Score 0–100 pro Heuristik → Top 3 mit höchstem Gap zur Best Practice.

**Kosten:** ~0 (kein API-Call, reiner DOM-Parse).

### 3.3 v2: AI-Powered Audit (Differentiator, 2–3 Tage)

**Warum v2 obendrauf:** Heuristiken sind gut für Standard-Fälle. AI versteht Kontext:
- „Das ist eine SaaS-Landingpage, nicht E-Commerce — andere Regeln."
- „Die Copy ist gut geschrieben, aber die Value Proposition fehlt."
- „Der Pricing-Bereich hat zu viele Optionen (Choice Paralysis)."

**Prompt-Design:**

```
You are a CRO (Conversion Rate Optimization) expert with 15 years
of experience optimizing landing pages.

Analyze this landing page:

Page goal: {signups | purchases | engagement}
URL: {url}
Industry: {detected_industry}

Page structure:
{dom_summary}

Key copy elements:
- Headline: {h1_text}
- Subheadline: {h2_text}
- CTA text: {cta_text}
- CTA position: {above_fold | below_fold}
- Form fields: {count}
- Social proof: {testimonial_count} testimonials, {logo_count} client logos

Existing test history on this site:
{last_3_test_results}

Based on this analysis, suggest the TOP 3 A/B tests that would
most likely improve the conversion rate. For each test:

1. What element to change (specific)
2. Why (CRO principle, not just "trust me")
3. Expected uplift range (conservative, cite similar cases)
4. Variant B suggestion (what the alternative should be)
5. Priority (1–3, with reasoning)

Format as structured JSON.
```

**Kosten:** ~500 Input-Tokens + ~400 Output-Tokens ≈ $0.003/Call (GPT-4o). Bei 10 Scans/Tag/User: ~$0.90/Monat/User.

### 3.4 v3: Learning Loop (Moat, 3–5 Tage)

**DB-Schema `site_insights`:**

```sql
CREATE TABLE site_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  domain TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_goal TEXT, -- 'signups', 'purchases', 'engagement'
  detected_industry TEXT, -- 'saas', 'ecommerce', 'agency', etc.

  -- Analysis results
  analysis_json JSONB, -- Full heuristic + AI analysis
  top_opportunities JSONB, -- Top 3 suggestions with rationale
  analyzed_at TIMESTAMPTZ DEFAULT now(),

  -- Feedback from completed tests
  test_results_json JSONB, -- Results of tests that were suggested here
  effective_uplift NUMERIC, -- Aggregated uplift from following suggestions

  UNIQUE(user_id, domain, page_url)
);
```

**Feedback-Loop:**

```
1. User führt Test #1 durch (CTA above fold)
2. Winner: Variante B, +14% uplift
3. Nächster Scan: Prompt enthält:
   "Previous test on this site: CTA above fold → +14% uplift.
    This site responds well to visibility improvements.
    Prioritize structural changes over copy changes."
4. Nächste Top 3 sind kontextuell schlauer
```

### 3.5 API-Route

```
POST /api/analyze
Body: { domain: "landingpage.com", page_goal: "signups" }
→ Server fetch der Seite (SSRF-geschützt)
→ v1 Heuristik-Analyse
→ (Pro) v2 AI-Analyse
→ v3 Persist in site_insights
← { opportunities: [...], analyzed_at, next_scan_at }
```

### 3.6 UI-Platzierung

Die Analyse-Ergebnisse erscheinen an **drei Touchpoints**:

| Touchpoint | Was | Trigger |
|---|---|---|
| **Dashboard Overview** | Kompakte „Top Opportunity"-Card unter Metric-Cards | Nach Domain-Verifikation, auto-getriggert |
| **Dashboard /tests** | „Suggestions"-Tab neben Test-Grid | Manuell, oder nach Test-Abschluss |
| **Figma Plugin** | „What to test next"-Panel beim Erstellen eines neuen Tests | Wenn `site_insights` existiert |

## 4. Gating & Pricing

| Tier | v1 (Heuristics) | v2 (AI) | v3 (Learning) |
|---|---|---|---|
| **Free** | ✅ 1 Scan, dann locked | ❌ | ❌ |
| **Pro** | ✅ Unlimited | ✅ 10 Scans/Monat | ✅ |
| **Agency** | ✅ Unlimited | ✅ 50 Scans/Monat | ✅ |

**Free-Tier-Logik:** 1 Scan beim Onboarding als Aha-Moment („Wow, das Tool sagt mir was ich testen soll"), danach Paywall. Der Wert ist sofort sichtbar, Conversion-Druck hoch.

## 5. Impact auf die Gesamtstrategie

| Vorher | Nachher |
|---|---|
| „Hier ist ein A/B-Tool. Bau Tests." | „Deine Site hat diese 3 Probleme. Ich bau dir den Test." |
| Passives Tool | Aktiver CRO-Co-Pilot |
| Designer muss wissen WAS er testen will | Tool sagt WAS + WARUM |
| Nach Test: Stille | Nach Test: „Und jetzt das hier." |
| Churn nach 1–2 Tests | Hooked Loop: teste → gewinne → nächster Test |
| Austauschbar | Moat (lernt mit jeder Site dazu) |

## 6. Offene Fragen

- **Wie tief parsen?** Ganze Seite oder nur above-fold? → Erst above-fold (mobile + desktop), später Full-Page.
- **Wie oft neu scannen?** → Nach jedem abgeschlossenen Test + manuell triggerbar. Max 1×/Tag automatisch.
- **Konkurrenz?** Kein A/B-Tool macht das. Closest: Hotjar AI-Survey-Analyse, aber kein „was testen"-Output. SEMrush/ahrefs Site-Audit, aber SEO, nicht CRO.
- **Später: Heatmap-Integration?** → Wenn wir Click-Tracking im Snippet haben, fließen echte Hotspots in die Analyse ein. Das wäre v4.

## 7. Build-Reihenfolge

| # | Phase | Status |
|---|---|---|
| 1 | **v1 — Heuristic Audit**: `POST /api/analyze`, DOM-Parse, Heuristik-Matrix | ⬜ Offen (`lib/croHeuristics.ts` existiert, nicht eingebunden) |
| 2 | **v2 — AI Audit**: OpenAI-Integration, Prompt-Engineering, Pro-Gating | ✅ Live (13.07.2026 — `/api/suggestions` + `lib/croAnalyze.ts`) |
| 3 | **v3 — Learning Loop**: `site_insights`-Tabelle, Feedback-in-Prompt, Figma-Plugin | 🟡 DB-Schema deployed, Feedback-Logik fehlt |

> **Nächster Schritt:** v1 Heuristiken in Agent-Pipeline integrieren → v3 Learning Loop schließen.

> **Start v1 sofort nach ersten 3 Design-Partnern.** Der Aha-Moment „Tool sagt mir was ich testen soll" ist das, was Designer converted.
