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

## Security

### Subresource Integrity (SRI)

Das `ab.js`-Snippet wird auf fremden Websites geladen. Zum Schutz vor Supply-Chain-Angriffen empfehlen wir das `integrity`-Attribut:

```html
<script async src="https://www.getvariante.com/ab.js"
  integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW"
  crossorigin="anonymous"></script>
```

> Der Hash wird bei jedem `ab.js`-Release neu generiert (`sha384`). Ohne SRI könnte ein kompromittierter Vercel-Account Schadcode auf allen Kunden-Sites ausführen.
