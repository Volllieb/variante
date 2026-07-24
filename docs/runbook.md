# Incident-Runbook — variante

> Was tun, wenn Production brennt. Zuerst Symptom identifizieren, dann Szenario abarbeiten.
> Stack: Vercel (www.getvariante.com) · Supabase Frankfurt (Postgres + Auth) · Upstash Redis · Stripe · OpenAI · Resend · Sentry (Server + Edge).

## Erste 5 Minuten — Diagnose

1. **Sentry** prüfen: neue Issues? Welche Route, welcher Fehler?
2. **Vercel Dashboard → Deployments**: Letztes Deployment fehlgeschlagen oder zeitlich korreliert?
3. **Vercel Logs** (`vercel logs` oder Dashboard): 500er auf welchen Routen?
4. **Supabase Dashboard → Health**: Datenbank erreichbar? Connection-Count?
5. Eingrenzen: Betrifft es **Kunden-Sites** (ab.js/resolve/event), das **Dashboard**, oder **Billing**?

Wichtigster Fakt für die Triage: **ab.js hat einen 10s-Safety-Timeout** — wenn die API komplett ausfällt, zeigen Kunden-Sites nach spätestens 10s das Original (Variante A). Kundenseiten gehen durch einen variante-Ausfall nicht kaputt, es findet nur kein Testing statt.

---

## Szenario: Datenbank-Ausfall (Supabase)

**Symptom:** 500 auf praktisch allen Routen (`db error`), Dashboard lädt nicht, Sentry voll mit Supabase-Fehlern.

- Diagnose: [status.supabase.com](https://status.supabase.com) + Supabase Dashboard → Project Health.
- Wenn Supabase-Incident: abwarten, Status-Update kommunizieren. Nichts selbst restarten.
- Wenn eigenes Problem (Connection-Limit erreicht, Free-Tier 500 Connections): Supabase Dashboard → Database → Connections prüfen; ggf. auf Pro upgraden.
- Restore: Supabase Dashboard → Backups → Point-in-Time (daily Backups built-in, 7 Tage Retention im Free-Tier).
- **RTO-Ziel:** 15 min Diagnose + Kommunikation. **RPO:** max. 24h (Daily Backup).

## Szenario: Deployment kaputt

**Symptom:** Fehler unmittelbar nach `vercel promote` / Merge auf master.

```bash
# Sofort zurück auf das letzte funktionierende Deployment:
vercel ls                      # Deployments auflisten
vercel rollback                # oder: vercel promote <alte-deployment-url>
```

- master bleibt danach kaputt → Fix als Feature-Branch, Preview testen, dann erneut promoten.
- Prävention: Preview-First-Regel (AGENTS.md) — nie ungetestet promoten.

## Szenario: Redis-Ausfall (Upstash)

**Symptom:** Rate-Limiting-Fehler in Logs, `[rateLimit]`-Warnungen.

- **Kein kritischer Ausfall:** `lib/rateLimit.ts` fällt automatisch auf In-Memory-Limits pro Instanz zurück. Die App funktioniert weiter, Limits sind nur weniger strikt (pro Vercel-Instanz statt global).
- Diagnose: [status.upstash.com](https://status.upstash.com) + Upstash Console (amazing-mudfish-98038).
- Wenn Free-Tier-Limit erreicht (Request-Quota): Upgrade oder bis Monatsende In-Memory akzeptieren.

## Szenario: OpenAI-Ausfall oder Kosten-Explosion

**Symptom:** `/api/generate`, `/api/agent`, `/api/suggestions` schlagen fehl oder Kosten steigen.

- Ausfall: [status.openai.com](https://status.openai.com). Kein Handlungsbedarf — Fehler werden im UI angezeigt, Kern-Produkt (laufende Tests) ist nicht betroffen.
- Kosten: Caps greifen automatisch — `OPENAI_MAX_MONTHLY_COST` (20 $/Monat Pro, 5 $ Free, 60 $ Agency) via `profiles.monthly_gen_cost`. Zusätzlich Tages-Limits für Previews (`PREVIEW_DAILY_*`, `REFINE_DAILY_*`).
- Not-Aus: `OPENAI_API_KEY` in Vercel entfernen + redeploy → alle AI-Features geben kontrollierte Fehler, Rest läuft.

## Szenario: Stripe-Webhooks schlagen fehl

**Symptom:** Kunde zahlt, bleibt aber auf Free. Stripe Dashboard → Webhooks zeigt Failures.

- Diagnose: Stripe Dashboard → Developers → Webhooks → Delivery-Log. Sentry nach `stripe` filtern.
- Stripe retried automatisch (bis zu 3 Tage, exponentiell). Idempotency ist implementiert (Migration 008) — Retries sind gefahrlos.
- Manueller Replay: Stripe Dashboard → Webhook-Event → "Resend".
- Wenn `STRIPE_WEBHOOK_SECRET` rotiert wurde: neuen Wert in Vercel setzen + redeploy.

## Szenario: Rate-Limit blockiert legitime User

**Symptom:** 429-Reports von echten Usern.

- Limits: resolve/event 30/min/IP · snippet-check 10/min/IP · temp-session 5/min/IP + 100/min global · Preview/Refine-Tageslimits (env-konfigurierbar).
- Kurzfristig: Limit-Wert in der Route erhöhen, Preview testen, promoten. Preview/Refine-Limits gehen ohne Deploy via Env-Var.
- Ursache prüfen: Ein Corporate-NAT (viele User, eine IP) kann 30/min reißen — dann Limit für die Route erhöhen, nicht global.

## Szenario: ab.js-Bug auf Kunden-Sites

**Symptom:** Kunde meldet kaputte Seite / Flackern.

- Sofort-Entlastung für den Kunden: Test im Dashboard pausieren (paused wird bei resolve nicht ausgeliefert).
- ab.js wird mit 1h-Cache (`must-revalidate`) serviert — ein Fix ist nach spätestens 1h überall. Kein Kill-Switch nötig: Snippet entfernen können Kunden selbst.
- Bei ab.js-Release: SRI-Hash neu generieren (Baustelle #2).

## Backups & Datenverlust

| Was | Wo | Retention |
|---|---|---|
| Datenbank | Supabase Daily Backup (built-in) | 7 Tage (Free) |
| Code | GitHub (Volllieb/variante) | vollständig |
| Env-Vars | Vercel (Source of Truth) + `.env.example` als Doku | — |
| Statische Assets | Git + Vercel CDN | vollständig |

Env-Vars haben **kein** automatisches Backup — bei Bedarf `vercel env pull` Ausgabe sicher ablegen.

## Kommunikation

- Einzelunternehmen, kein Pager: Sentry-Email-Alerts = primärer Kanal. Ziel-Response: 1h (Soft-Launch-SLA aus Roadmap).
- Betroffene Pro-Kunden bei >1h Ausfall proaktiv per Email (Resend) informieren.
- Post-Incident: Eintrag in `docs/historie.md` (was, warum, Fix, Prävention).
