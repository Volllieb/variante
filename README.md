# variante — A/B-Testing aus Figma

> **Kurzübersicht & Schnellstart.** Produktbeschreibung, Ordnerstruktur, Dev-Kommandos. Details in [`PROJEKT.md`](./PROJEKT.md).

Designer pickt Element auf Live-Site (eingebauter Picker im Snippet) → beschreibt Variante B in Figma → KI generiert HTML → Snippet trackt Conversions. **Kein Dev nötig.**

> **Ausführliche Projektdoku:** [`PROJEKT.md`](./PROJEKT.md) (DSO)  
> **GTM-Strategie:** [`docs/gotomarket.md`](./docs/gotomarket.md)  
> **Arbeitsanweisungen:** [`AGENTS.md`](./AGENTS.md)

## Pakete

| Ordner | Beschreibung | Deploy |
|---|---|---|
| `ab-tool/` | Aktive Next.js-App: API, Dashboard, Landing-Page | Vercel (`www.getvariante.com`) — Deploy aus Repo-Root |
| `figma-plugin/` | 🎉 Figma-Plugin für Test-Erstellung — [Community](https://www.figma.com/community/plugin/1653734891132085565) | Figma Store |
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

### Subresource Integrity (SRI)

Das `ab.js`-Snippet wird auf fremden Websites geladen. Zum Schutz vor Supply-Chain-Angriffen empfehlen wir das `integrity`-Attribut:

```html
<script async src="https://www.getvariante.com/ab.js"
  integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW"
  crossorigin="anonymous"></script>
```

> Der Hash wird bei jedem `ab.js`-Release neu generiert (`sha384`). Ohne SRI könnte ein kompromittierter Vercel-Account Schadcode auf allen Kunden-Sites ausführen.
