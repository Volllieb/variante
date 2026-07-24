# CLAUDE.md — variante

> **Produkt:** A/B-Testing für jede Website. URL eingeben → Element mit Built-in-Picker wählen → KI generiert Variante B → Snippet trackt Conversions. Figma-Plugin zeigt Live-Stats im Editor. Test-Creation-Flow im Dashboard integriert Figma als optionale Variant-Quelle.
> **Domain:** [www.getvariante.com](https://www.getvariante.com)
> **Phase:** GTM-Ready — Produktionsreife-Prüfung zu 92% abgeschlossen, keine Launch-Blocker

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19.2.4, Tailwind CSS v4 (CSS-based config, `globals.css`) |
| DB + Auth | Supabase (Postgres + JWT, SSR package) |
| Billing | Stripe (Checkout, Portal, Webhooks) |
| AI | OpenAI via AI SDK v7 (`ai` + `@ai-sdk/openai` + `@ai-sdk/react`) |
| Monitoring | Sentry (`@sentry/nextjs`), conditional on `SENTRY_DSN` |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| Icons | lucide-react |
| Charts | recharts |
| Validation | zod |
| E2E Tests | Playwright 1.61 |
| Load Tests | k6 |
| Snippet | Vanilla JS `ab.js` (~41 KB, ES5 IIFE, self-contained element picker) |

## Monorepo Structure

```
variante/
├── ab-tool/          # Next.js App — API, Dashboard, Landing (Vercel Root Dir)
├── figma-plugin/     # Figma Plugin (Stats-Only, 320×360px, zeigt Live-Test-Daten im Editor)
├── db/migrations/    # Supabase SQL (001–034, migration-tracking via schema_migrations)
├── docs/             # Brand, GTM, Architecture, Runbook, Future Features
├── .claude/          # Claude Code skills (13 installed) + settings
├── .github/          # CI (e2e.yml), Copilot agents, copilot-instructions.md
└── .githooks/        # post-commit (auto-push), pre-commit (vercel-build)
```

## Key Commands

```bash
# Development
npm run dev:tool              # Start Next.js dev server (localhost:3000)

# Building
npm run build:tool            # Build ab-tool only
npm run build:all             # Build everything

# Testing
cd ab-tool
npm run lint                  # ESLint flat config (no-explicit-any, no-unused-vars)
npm run test                  # Playwright E2E (chromium)
npm run test:smoke            # Smoke tests only
npm run test:node             # Node unit tests (sanitize, winner-guards, etc.)
npm run test:ci               # CI Playwright (headless, no-sandbox)
npm run loadtest              # k6 load tests
npm run vercel-build          # Production build (≡ next build)

# Deployment
vercel env pull .env.local --yes  # Sync env vars from Vercel
vercel deploy                     # Preview deploy
vercel promote <url>              # Promote preview → production
```

## Critical Rules (from AGENTS.md)

1. **Build before commit:** `npm run vercel-build` in `ab-tool/` MUST pass. Pre-commit hook enforces this.
2. **Work on `main`** unless risky changes → feature branch. Main = production.
3. **Preview-first deploy:** Feature branch → Vercel auto-deploys preview → test → `vercel promote`.
4. **Envs:** Source of truth = Vercel. `.env.example` documents all vars. `.env.local` is gitignored.
5. **Commit → Push after every logical unit.** Post-commit hook auto-pushes.
6. **Zero-confirmation policy:** Don't ask permission. Declare, decide, execute.
7. **Best practice always:** Correct types, no `any` hacks, no workarounds. ESLint enforces.
8. **User-first:** UX > technical elegance. Always.

## API Routes (40+ endpoints)

| Category | Routes |
|---|---|
| Agent | `/api/agent`, `/api/agent/runs` |
| Analytics | `/api/analytics/[testId]` |
| Billing | `/api/billing/checkout`, `/api/billing/portal`, `/api/stripe/webhook` |
| Cron | `/api/cron/{check-winners,snapshot-stats,cleanup-webhooks,cleanup-data,cleanup-previews,weekly-digest}` |
| Core | `/api/resolve`, `/api/assign`, `/api/capture`, `/api/event`, `/api/events` |
| Domains | `/api/domains`, `/api/domains/verify` |
| Figma | `/api/figma/stats` (Plugin-Stats), `/api/capture` (Figma→Test Bridge) |
| Generation | `/api/generate`, `/api/suggestions` |
| Tests | `/api/tests`, `/api/tests/[id]`, `/api/test-wizard/*` |
| User | `/api/profile`, `/api/profile/avatar`, `/api/profile/export`, `/api/token`, `/api/token/regenerate` |
| Other | `/api/health`, `/api/temp-session`, `/api/landing-demo`, `/api/snippet-check`, `/api/results/[id]`, `/api/results/export` |

> **Hinweis:** `/api/picker-bridge` ist deaktiviert (Security-Audit SEC-01). Der Element-Picker läuft direkt über `ab.js` im Built-in-Modus (`?ab_pick=` Query-Parameter).

## Key Libraries (`ab-tool/lib/`)

- **Auth:** `auth.ts`, `authErrors.ts`, `supabase.ts`, `supabaseServer.ts`, `supabaseBrowser.ts`
- **AI/CRO:** `agentTools.ts`, `croAnalyze.ts`, `croHeuristics.ts`, `generateVariantText.ts`, `previewAnalyze.ts`
- **Security:** `cors.ts`, `rateLimit.ts`, `ssrf.ts`, `sanitize.ts`, `pii.ts`, `safeFetch.ts`
- **Business:** `significance.ts`, `snippetCode.ts`, `stripe.ts`, `planLimits.ts`, `landingCopy.ts`
- **Hooks:** `useRealtime.ts`, `useTestList.ts`, `useFocusTrap.ts`

## Design System

- **Dark-only** (no light mode). CSS custom properties in `globals.css`.
- **Colors:** `--color-bg-0` (black), `--color-bg-1` (#0a0a0a), `--color-bg-2` (#111111), text hierarchy (text, text-2, text-3)
- **Tailwind v4:** CSS-based theme via `@theme` block. No `tailwind.config.js`.
- **Components:** `.btn-primary`, `.btn-secondary`, `.card-lift`, `.section`, `.hero-headline`, `.stat-bar`
- **Accessibility:** `prefers-reduced-motion`, `focus-visible` WCAG styles, skip-link

## Figma Plugin & MCP

- **Plugin**: Stats-Only (320×360px). Zeigt Live-Test-Statistiken im Figma-Editor an. Verweist auf das Dashboard für die Test-Erstellung. Community-Listing: [Plugin #1653734891132085565](https://www.figma.com/community/plugin/1653734891132085565).
- **Figma MCP**: Konfiguriert in `.vscode/mcp.json` (Figma MCP server at `http://127.0.0.1:3845/mcp`). Wird für Design-Token-Sync und Plugin-Entwicklung genutzt.
- **Integration**: Dashboard Wizard bietet "From Figma"-Option für Variant B. User wählt Element in Figma → KI übersetzt in Code → Test wird im Dashboard erstellt. /api/figma/stats liefert Stats fürs Plugin, /api/capture speichert Figma-Selektionen.

## Security Posture

- CSP + HSTS + X-Frame-Options + Permissions-Policy in `next.config.ts`
- SSRF protection (`lib/ssrf.ts`), CORS whitelist (`lib/cors.ts`)
- PII redaction (`lib/pii.ts`), HTML sanitization (`lib/sanitize.ts`)
- Rate limiting (`lib/rateLimit.ts`) via Upstash Redis
- Signed Assignment Tokens, bcrypt IP hashing
- No third-party CDN analytics. No credit cards on own server.
- SRI hash for `ab.js` deliveries
