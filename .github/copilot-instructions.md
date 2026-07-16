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
| `@stripe` | billing, checkout, payment, webhook, subscription | Stripe-Integration (Checkout, Portal, Webhooks) |
| `@deployment-expert` | deploy, vercel, CI/CD, environment, "deploy das" | Vercel-Deployments, CI/CD, Env-Vars |
| `@performance-optimizer` | performance, Core Web Vitals, caching, "mach das schneller" | Core Web Vitals, Rendering-Strategien, Caching |
| `@ai-architect` | architektur, AI-SDK, Vercel AI, "wie baue ich X mit AI" | AI-Architektur, Vercel AI SDK, Agent-Design |
| `@seo` | SEO, Meta-Tags, Structured Data, Sitemap, robots.txt, Core Web Vitals, SERP, JSON-LD | Ganzheitliche Suchmaschinenoptimierung |
| `@wrapup` | wrapup, aufräumen, session beenden, cleanup, fertig für heute | Session-Abschluss: tote Files, Ponytail-Review, Git-Hygiene, Doku-Update |
| `Explore` | codebase search, "wo ist X?", "wie hängt Y zusammen?" | Read-only Code-Exploration |

## Skills

| Skill | Trigger |
|---|---|
| `ui-ux-pro-max` | Design-Fragen, Komponenten, UI/UX-Entscheidungen |
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
- **Planung:** Vor größeren Tasks ausführlichen Plan skizzieren (Schritte, Risiken, Alternativen).
- **Rückfragen:** Bei Unklarheiten Annahme treffen, aber transparent machen ("Annahme: X"). Nur bei großen Entscheidungen nachfragen.
- **Todo-Listen:** Immer via `manage_todo_list` tracken.
- **Fokus:** Kurz & direkt. Kein Intro/Outro/Padding.

### Coding-Präferenzen
- **TypeScript:** Best Practice. Strict, korrekte Typen, keine any-Hacks.
- **React/Next.js:** Best Practice. Server Components first, Client nur wo nötig.
- **DRY:** Pragmatisch. Erst ab 3× Wiederholung abstrahieren — davor Kopieren ok.
- **Testing:** Nur kritische Pfade (Auth, Billing, Core-Logik). Nicht für jeden Component.
- **Error-Handling:** Ausgewogen. Kritische Pfade defensiv, Rest pragmatisch.

### Workflow
- **Subagents:** Automatisch nutzen wenn sinnvoll (@ponytail, @supabase, @stripe, etc.).
- **Review:** @ponytail automatisch nach jeder logischen Einheit aufrufen.
- **Build:** Automatisch vor Commit (`npm run vercel-build`).
- **Deploy:** Preview-First (seit 16.07.2026). Feature-Branch → automatischer Vercel Preview. `vercel promote <url>` nur auf explizite Anweisung. master = production — nicht direkt pushen außer production-ready.
- **Doku:** PROJEKT.md automatisch nach relevanten Änderungen fortschreiben.
- **Commits:** Nach logischen Einheiten (wenn Feature/Teil fertig), nicht nach jedem Micro-Step.

