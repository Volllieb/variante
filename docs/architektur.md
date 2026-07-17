# Architektur & Roadmap

> Dashboard-Architektur, Produkt-Ebenen, New-Test-Flow, Meilensteine, Nordstern, Leitplanken.

## Produkt-Ebenen

| Ebene | Ort | Zweck |
|---|---|---|
| **Health** | `/dashboard/health` | Health-Check: Snippet, Figma Plugin — permanenter Check, kein One-Time-Gate. |
| **Dashboard** | `/dashboard` | Täglicher Arbeitsplatz: Tests verwalten, Results checken, Billing. **Test-Erstellung hier** (TestCreationPanel). |
| **Creation** | Web (Dashboard) | 4-Step Wizard: Scan → Variant → Goal → Create. AI-generierte Varianten mit urlbox-Screenshot-Preview. |
| **Figma Plugin** | Figma | Referenz-Picker (Element-Selektor für `?ab_pick=`) + Akquise-Kanal. Keine Variant-Erstellung mehr. |

## "New test"-Flow

```
User klickt [+ New test]
         │
         └─ TestCreationPanel öffnet (4 Steps)
              Step 1: URL scannen → AI CRO-Vorschläge
              Step 2: Element wählen → Variante generieren → Preview (urlbox)
              Step 3: Conversion-Goal definieren
              Step 4: Review → Test erstellen
```

**AI-Limits pro Plan** (in `planLimits.ts`):

| Plan | AI Scans/Monat | Variant-Generierungen/Monat | Agent-Runs/Monat | OpenAI-Budget/Monat |
|---|---|---|---|---|
| Free | 1 | 1 | 0 | $5 |
| Pro | 50 | 50 | 20 | $25 |
| Agency | ∞ | ∞ | ∞ | $100 |

## Meilensteine

1. ~~**M1: Fremd-Site-Test**~~ ✅
2. ~~**M2: Store-Freigaben**~~ 🎉 — Figma-Plugin LIVE. Design-Partner-Onboarding (1/5 angefragt).
3. **M3: Product Hunt Launch** — Demo-GIF + Case-Studies.
4. **M4: Erster Pro-Kunde** (Ziel: September) — Checkout → Webhook → Badge-aus.
5. **M5: Self-Improving Site Engine v1** (Ziel: nach 3 Design-Partnern) — Rule-Based Site-Analyse mit Top-3-Chancen.

## Nordstern

- **Distribution > Produkt.** Figma Community = Burggraben.
- **Badge = Wachstumsmotor.** Viral > bezahlt.
- **Plugin = Creation, Web = Analysis.** Keine Results ins Plugin.
- **Self-Improving Site Engine = Moat.** Kein anderes A/B-Tool analysiert deine Site und sagt dir, was du als nächstes testen sollst — geschweige denn, dass es aus deinen Ergebnissen lernt.
- **Keine Features ohne Revenue-Signal.**

## Vision: ab.js → Auto-Scan → 1-Klick

1. **ab.js installieren** — DomainGate führt durch Snippet-Installation + Verify
2. **Auto-Scan** — Sobald ab.js lebt, scannt variante die Site automatisch
3. **1-Klick "Optimize my site"** — CRO-Agent analysiert, generiert 3 Varianten, legt A/B-Tests an

**Onboarding-Wahl:** Nach Domain-Verifikation zwei Pfade:
- 🎨 **Start with Figma** — Designer-native: Plugin installieren, Varianten in Figma bauen, syncen
- 🤖 **Start with Auto-Optimize** — AI-native: Site-Scan, automatische Varianten, Tests in 30s live

## Anti-Roadmap

| Nicht bauen | Warum |
|---|---|
| Agency-Tier | Kein Revenue-Signal |
| Mehrere Metriken parallel | 6–10h, alle Schichten |
| A/B-Editor im Web | Creation = Plugin |
| Analytics-Dashboard | Fokus auf A/B-Testing |
| ⬇️ Self-Improving Site Engine | **Ausnahme — bauen wir.** Start v1 sofort nach ersten 3 Design-Partnern. |

## Technische Leitplanken

- **Monolith** (`ab-tool/`). Kein Microservice-Split bis >1000 Tests/Tag.
- **Eine Produktions-URL** (`www.getvariante.com`). Kein Staging bis >10 Kunden.
- **Supabase + Upstash Redis.** Kein Kafka, TimescaleDB. Redis nur für Rate-Limiting (Free Tier).
- **ab.js bleibt Vanilla JS.** Kein npm, kein Build. Das ist der USP.
