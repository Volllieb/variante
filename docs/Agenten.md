# Agenten & Skills — variante

> Stand: 24.07.2026. Konfiguration in `.github/copilot-instructions.md` und `.claude/settings.json`.

## Agenten

| Agent | Trigger | Zuständig |
|---|---|---|
| `@ponytail` | review, refactor, simplify, over-engineering, YAGNI | Code-Review, Aufräumen, Kürzen |
| `@redesign` | redesign, neugestalten, UI überarbeiten, modernisieren | Mutige visuelle Neugestaltungen |
| `@supabase` | migration, schema, RLS, policy, auth, query, Trigger, RPC | DB, Auth, Migrationen, RLS, RPCs |
| `@wrapup` | wrapup, aufräumen, session beenden, cleanup | Session-Abschluss: tote Files, Ponytail-Review, Git-Hygiene, Doku-Update |
| `@engineer` | Default-Implementierungsagent | Implementation, Bugfixes, Refactoring, Feature-Arbeit |
| `Explore` | codebase search, "wo ist X?", "wie hängt Y zusammen?" | Read-only Code-Exploration |

## Skills (installiert)

| Skill | Trigger |
|---|---|
| `frontend-design` | Landingpage, Dashboard, Hero-Sektionen, visuelle Identität |
| `ui-ux-pro-max` | Design-Fragen, Komponenten, UI/UX-Entscheidungen |
| `seo` | SEO, Meta-Tags, Structured Data, JSON-LD |
| `performance-optimizer` | Core Web Vitals, LCP, CLS, INP, Caching |
| `ai-architect` | AI SDK, Agent-Design, Provider-Konfiguration |
| `stripe-best-practices` | Stripe-API-Design, Sicherheit |
| `nextjs` | Next.js App Router, Server Components, Routing |
| `deployments-cicd` | Vercel-Deployments, CI/CD, Rollbacks |
| `env-vars` | Vercel-Env-Vars, .env-Management |
| `vercel-cli` | Vercel CLI (deploy, env, domains, dev) |
| `vercel-functions` | Serverless, Fluid Compute, Cron Jobs |
| `react-best-practices` | React/Next.js Performance (64 Regeln) |

## Prompt-Template

Siehe `docs/prompt-template.md`. Kurzform:

```
[Feature/Fix/Change]: {Was soll passieren?}

Kontext: Siehe PROJEKT.md §{X}, orientier dich an app/{pfad}/page.tsx.

Done = {2-3 Akzeptanzkriterien}.

Vor Commit: npm run vercel-build in ab-tool/ muss grün sein.
```
