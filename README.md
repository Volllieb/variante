# variante — A/B-Testing für jede Website

> **Kurzübersicht & Schnellstart.** Produktbeschreibung, Ordnerstruktur, Dev-Kommandos. Details in [`PROJEKT.md`](./PROJEKT.md).

URL eingeben → Element mit Built-in-Picker wählen → KI generiert Variante B → Snippet trackt Conversions. Figma-Plugin zeigt Live-Stats im Editor. **Kein Dev nötig.**

> **Ausführliche Projektdoku:** [`PROJEKT.md`](./PROJEKT.md) (DSO)  
> **GTM-Strategie:** [`docs/gotomarket.md`](./docs/gotomarket.md)  
> **Arbeitsanweisungen:** [`AGENTS.md`](./AGENTS.md)

## Pakete

| Ordner | Beschreibung | Deploy |
|---|---|---|
| `ab-tool/` | Aktive Next.js-App: API, Dashboard, Landing-Page | Vercel (`www.getvariante.com`) — Deploy aus Repo-Root |
| `figma-plugin/` | 🎉 Figma-Plugin (Stats-Only, zeigt Live-Test-Daten) — [Community](https://www.figma.com/community/plugin/1653734891132085565) | Figma Store |
| `db/migrations/` | Supabase-SQL-Migrationen | SQL-Editor |

> Kein separates `ab-spike`-Projekt mehr; die aktive Produkt-Implementierung lebt in `ab-tool/`.

## Schnellstart

```bash
npm run dev:tool    # ab-tool → localhost:3000
npm run build:all   # alle Pakete bauen
```

## Migrationen

`db/migrations/` in aufsteigender Reihenfolge im
[Supabase SQL-Editor](https://supabase.com/dashboard/project/_/sql/new) ausführen.

**Was auf einer Datenbank schon gelaufen ist, steht in `schema_migrations`** (Migration 029):

```sql
select version, applied_at from schema_migrations order by version;
```

Jede neue Migration trägt sich am Ende selbst dort ein:

```sql
insert into schema_migrations (version) values ('030_beispiel') on conflict do nothing;
```

Zwei Dateien liegen bewusst **außerhalb** der Kette und dürfen nicht mitlaufen:

| Datei | Grund |
|---|---|
| `db/migrations/archive/002_migrate_v1_to_v2.sql` | Droppt `events cascade` — Migration 010 legt eine gleichnamige, produktive Tabelle an. Ein Re-Run löscht den Activity-Log. |
| `db/seeds/dogfooding.sql` | Enthält den Platzhalter `'DEINE_USER_ID_HIER'` und brach jeden vollständigen Durchlauf ab. Kein Schema-Change, sondern ein einmaliger Insert. |

`012b_usage_tracking.sql` enthält eine veraltete `increment_gen_cost`-Definition ohne
`search_path`. Die gültige Fassung steht in `027_recreate_increment_gen_cost.sql` —
012b niemals nach 027 erneut ausführen.

## Security

### Kein SRI im Snippet (bewusst)

Das Snippet lädt `ab.js` **ohne** `integrity`-Attribut:

```html
<script async src="https://www.getvariante.com/ab.js"></script>
```

SRI und ein selbst-aktualisierendes Snippet schließen sich aus: Der Hash steht
fest im `<head>` der Kundenseite, `ab.js` ändert sich bei jedem Release. Sobald
beide auseinanderlaufen, **blockiert der Browser `ab.js` auf jeder bereits
installierten Seite** — still, nur mit einer Console-Meldung, und damit ohne
Tracking, ohne Variante, ohne Picker. Genau das ist zweimal passiert (zuletzt
auf `vallisride.com`).

Der Restnutzen von SRI wäre hier klein: `ab.js` kommt von unserer eigenen Origin
über HTTPS + HSTS, der Angriffsvektor ist ausschließlich ein kompromittiertes
eigenes Vercel-Deployment — und dagegen schützt ein Hash nicht, den derselbe
Build erzeugt. Wer das Risiko trotzdem pinnen will, kopiert eine Version von
`ab.js` auf die eigene Domain und hostet sie selbst.

**Altinstallationen:** Snippets mit `integrity="sha384-…"` sind kaputt, sobald
`ab.js` neu ausgeliefert wurde. `/api/snippet-check` meldet solche Seiten als
`outdated`; das Dashboard weist auf das Neu-Einfügen des Snippets hin.
