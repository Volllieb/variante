# variante — A/B-Testing aus Figma

Designer wählt Element auf Live-Site → beschreibt Variante B in Figma → KI generiert HTML → Snippet trackt Conversions. **Kein Dev nötig.**

> **Ausführliche Projektdoku:** [`PROJEKT.md`](./PROJEKT.md) (DSO)  
> **GTM-Strategie:** [`GOTOMARKET.md`](./GOTOMARKET.md)  
> **Arbeitsanweisungen:** [`AGENTS.md`](./AGENTS.md)

## Pakete

| Ordner | Beschreibung | Deploy |
|---|---|---|
| `ab-tool/` | Aktive Next.js-App: API, Dashboard, Landing-Page | Vercel (`www.getvariante.com`) |
| `figma-plugin/` | Figma-Plugin für Test-Erstellung | manuell laden |
| `chrome-extension/` | Chrome-Extension für Element-/Goal-Picking | manuell laden |
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
