# Variante — KI-Coding-Infrastruktur

> **Hauptanweisung:** [`AGENTS.md`](../AGENTS.md) — Arbeitsweise, Sprache, Standing Orders, Prüfpflicht, **Build-Pflicht, Deploy-Pflicht**, **Schätzungen & Qualität** (keine Zeitschätzungen, nur Aufwand; immer sauberste Version & Best Practice).
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

