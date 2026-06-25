# variante — A/B-Testing aus Figma

Designer wählt Element auf Live-Site → beschreibt Variante B in Figma → KI generiert HTML → Snippet trackt Conversions. **Kein Dev nötig.**

> **Ausführliche Projektdoku:** [`PROJEKT.md`](./PROJEKT.md) (DSO)  
> **GTM-Strategie:** [`GOTOMARKET.md`](./GOTOMARKET.md)  
> **Arbeitsanweisungen:** [`CLAUDE.md`](./CLAUDE.md)

## Pakete

| Ordner | Beschreibung | Deploy |
|---|---|---|
| `ab-tool/` | Next.js API + Dashboard | Vercel (`ab-tool-pied.vercel.app`) |
| `ab-spike/` | Demo-Client-Site | Vercel (`ab-spike.vercel.app`) |
| `figma-plugin/` | Figma-Plugin | manuell laden |
| `chrome-extension/` | Chrome-Extension | manuell laden |
| `db/migrations/` | Supabase SQL | SQL-Editor |

## Schnellstart

```bash
npm run dev:tool    # ab-tool → localhost:3000
npm run dev:spike   # ab-spike → localhost:3001
npm run build:all   # alle Pakete bauen
```

## Migrationen

`db/migrations/` in aufsteigender Reihenfolge im
[Supabase SQL-Editor](https://supabase.com/dashboard/project/_/sql/new) ausführen.
