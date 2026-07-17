# PROJEKT.md — variante

> Single Source of Truth. Fakten, Entscheidungen, Richtung.
> Anweisungen: AGENTS.md · Infrastruktur: .github/copilot-instructions.md · Historie: docs/historie.md · Architektur: docs/architektur.md · Baustellen: docs/baustellen.md

---

## §1 Identität

| Feld | Wert |
|---|---|
| **Produkt** | variante — autonomer KI-Agent für A/B-Testing, kein Dev nötig. |
| **ICP** | Designer, Indie Hacker & Gründer |
| **Rechtsform** | Einzelunternehmen (Bayern/DE) |
| **Phase** | Post-MVP → Go-to-Market |
| **Stand** | 17.07.2026 — Production-Ready Wizard. Hybrid-Onboarding v4. Build grün. |
| **Ziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community). |

## §2 Stack

| Komponente | Technologie |
|---|---|
| API + Dashboard | Next.js 16 (App Router) auf Vercel |
| Datenbank + Auth | Supabase (Postgres + JWT) |
| Billing | Stripe (Checkout, Portal, Webhooks) |
| KI-Generierung | OpenAI API (~0,3 ct/Call) |
| Snippet | ab.js (Vanilla JS, ~14 KB, eingebauter Element-Picker) |
| Figma-Plugin | TypeScript + HTML (Figma-native Tokens) |
| **KI-Agenten** | 5 Agents: @engineer, @ponytail, @redesign, @supabase, @wrapup + Explore · 16 Skills |

## §3 Struktur

ab-tool/ — Next.js (API, Dashboard, Landingpage)
figma-plugin/ — code.ts + ui.html
db/migrations/ — Supabase SQL (001–023)
docs/ — Brand, GTM, Leads, Historie, Architektur, Baustellen, Future-Features

## §4 Deployment

- Production: www.getvariante.com (Git-Connected Vercel)
- Preview-First (seit 16.07.2026): Feature-Branch → Preview → vercel promote → Production
- master = production. Nur production-ready Code auf master.
- Git: github.com/Volllieb/variante.git · Auto-Push: post-commit-Hook in .githooks/

## §5 Pricing

| Tier | Preis | Inhalt |
|---|---|---|
| **Free** | 0 € | 1 aktives Experiment, Badge an |
| **Pro** | 35 €/Monat | Unbegrenzt, Badge aus, Signifikanz, Auto-Winner |
| **Agency** | 99 €/Monat | Auf Eis |

KI-Kosten: ~0,3 ct/Call → Marge ~100 %. AI-Gen auch im Free-Tier.

## §6 Plattform-Support & Steuer

Custom HTML, WordPress, Next.js/React, Shopify: ✅ | Webflow: ⚠️ Paid | Framer, Wix, Squarespace: ❌
Steuer: Kleinunternehmer (§19 UStG).

## §7 Security

- Vercel us-east (DPA + SCCs), Supabase Frankfurt
- Supabase JWT, bcrypt, HTTP-only Cookies, API-Key UUID v4
- Kein CDN/Analytics-Drittanbieter. Keine Kreditkarten auf eigenem Server.

## §8 Selbstprüfung

> Bei JEDER Änderung. Erst reviewen, dann pushen:

- [ ] git diff — sinnvoll? Kein Debug-Code?
- [ ] git status — kein node_modules/, .next/, dist/ im Index
- [ ] npm run build in ab-tool/ — grün
- [ ] Geändertes committed + gepusht?
- [ ] PROJEKT.md §1 (Stand), docs/historie.md, §3 (Struktur) aktuell?
- [ ] Neue Entscheidungen dokumentiert?
