# Variante — KI-Coding-Infrastruktur

> **Hauptanweisung:** [`AGENTS.md`](../AGENTS.md) — Arbeitsweise, Sprache, Standing Orders, Prüfpflicht, **Build-Pflicht, Deploy-Regel**, **Schätzungen & Qualität** (keine Zeitschätzungen, nur Aufwand; immer sauberste Version & Best Practice).
> **Wissensquelle:** [`PROJEKT.md`](../PROJEKT.md) — Projektidentität, Stack, Struktur, Deployment, Pricing, Historie.
> **Vercel-Ökosystem:** [`vercel-ecosystem.md`](../.agents/vercel-ecosystem.md) — Produkte, Decision-Matrizen, Cross-Product-Workflows.

## Agenten

| Agent | Trigger | Zuständig |
|---|---|---|
| `@ponytail` | review, refactor, simplify, over-engineering, YAGNI, "geht das nicht einfacher?" | Code-Review, Aufräumen, Kürzen |
| `@redesign` | redesign, neugestalten, UI überarbeiten, modernisieren, verschönern | Mutige visuelle Neugestaltungen |
| `@supabase` | migration, schema, RLS, policy, auth, query, 'neue Tabelle', Trigger, RPC | DB, Auth, Migrationen, RLS, RPCs |
| `@wrapup` | wrapup, aufräumen, session beenden, cleanup, fertig für heute | Session-Abschluss: tote Files, Ponytail-Review, Git-Hygiene, Doku-Update |
| `@engineer` | **Default-Implementierungsagent.** Alle Tasks, die kein Spezialist braucht — "implementiere X", "fix den Bug", "bau Feature Y" | Implementation, Bugfixes, Refactoring, Feature-Arbeit |
| `Explore` | codebase search, "wo ist X?", "wie hängt Y zusammen?" | Read-only Code-Exploration |

## Skills

| Skill | Trigger |
|---|---|
| `frontend-design` | Landingpage, Dashboard, Hero-Sektionen, visuelle Identität, Typografie-Entscheidungen, Anti-Template-Design |
| `ui-ux-pro-max` | Design-Fragen, Komponenten, UI/UX-Entscheidungen |
| `seo` | SEO, Meta-Tags, Structured Data, JSON-LD, Sitemap, robots.txt, Canonical URLs, SERP-Snippets |
| `performance-optimizer` | Core Web Vitals, LCP, CLS, INP, Caching, Bundle-Analyse, Ladezeit-Optimierung |
| `ai-architect` | AI SDK, Agent-Design, ToolLoopAgent, Provider-Konfiguration, Chatbot-Architektur |
| `stripe-best-practices` | Stripe-API-Design, Sicherheit |
| `stripe-directory` | Stripe-Partner-Suche |
| `stripe-projects` | Infrastruktur-Provisioning |
| `upgrade-stripe` | Stripe-API-Upgrades |
| `nextjs` | Next.js App Router, Server Components, Routing, Rendering |
| `deployments-cicd` | Vercel-Deployments, CI/CD, Rollbacks |
| `env-vars` | Vercel-Env-Vars, OIDC, .env-Management |
| `vercel-cli` | Vercel CLI (deploy, env, domains, dev) |
| `vercel-functions` | Serverless, Edge, Fluid Compute, Cron Jobs |
| `react-best-practices` | React/Next.js Performance (64 Regeln) |

## Persönliche Präferenzen (Valentin)

> Erfasst per Fragebogen am 16.07.2026. Diese Präferenzen überschreiben ggf. allgemeine Regeln aus AGENTS.md.

### Kommunikation & Planung
- **Sprache:** Code & Commits Englisch, Doku & Diskussion Deutsch.
- **Planung:** Vor größeren Tasks ausführlichen Plan skizzieren (Schritte, Risiken, Alternativen). **Jeder Schritt mit Agent-Zuweisung:** `[@agent]` vor dem Schritt-Titel. Format:
  ```
  Plan: {Feature-Name}
  1. [@engineer] DB-Migration + API-Route — orientier dich an Pattern-Katalog §1+§2
  2. [@ponytail] Review Schritt 1
  3. [@engineer] Client Component + Integration — orientier dich an Pattern-Katalog §3
  4. [@ponytail] Final Review
  5. [@wrapup] Aufräumen, Build, Commit
  ```
  Agenten: `[@engineer]` (Default), `[@supabase]` (nur isolierte DB-Tasks), `[@ponytail]` (Review), `[@redesign]` (visuelles Redesign), `[@wrapup]` (Session-Abschluss).
- **Rückfragen:** Bei Unklarheiten Annahme treffen, aber transparent machen ("Annahme: X"). Nur bei großen Entscheidungen nachfragen.
- **Todo-Listen:** Immer via `manage_todo_list` tracken.
- **Fokus:** Kurz & direkt. Kein Intro/Outro/Padding.

### Coding-Präferenzen
- **User first:** User hat höchste Priorität. Technische Lösungen immer auf Bedienungsfreundlichkeit abwägen. UX schlägt Architektur-Eleganz.
- **Frontend UX:** Jedes UI-Element muss intuitiv, schnell, barrierefrei und angenehm sein. Keine Kompromisse bei Ladezeit, Klarheit, Interaktionsfluss.
- **TypeScript:** Best Practice. Strict, korrekte Typen, keine any-Hacks.
- **React/Next.js:** Best Practice. Server Components first, Client nur wo nötig.
- **DRY:** Pragmatisch. Erst ab 3× Wiederholung abstrahieren — davor Kopieren ok.
- **Testing:** Nur kritische Pfade (Auth, Billing, Core-Logik). Nicht für jeden Component.
- **Error-Handling:** Ausgewogen. Kritische Pfade defensiv, Rest pragmatisch.

### Workflow
- **Subagents:** Automatisch nutzen wenn sinnvoll (@ponytail, @supabase, @redesign, @wrapup).
- **Review:** @ponytail automatisch nach jeder logischen Einheit aufrufen.
- **Build:** Automatisch vor Commit (`npm run vercel-build`).
- **Deploy:** Preview-First (seit 16.07.2026). Feature-Branch → automatischer Vercel Preview. `vercel promote <url>` nur auf explizite Anweisung. master = production — nicht direkt pushen außer production-ready.
- **Doku:** PROJEKT.md automatisch nach relevanten Änderungen fortschreiben.
- **Commits:** Nach logischen Einheiten (wenn Feature/Teil fertig), nicht nach jedem Micro-Step.

