# AB-Test Monorepo

Designer-natives A/B-Testing: Element in Figma auswählen → KI generiert Variante B → Snippet trackt Conversions.

## Pakete

| Ordner | Beschreibung | Deploy |
|--------|-------------|--------|
| `ab-tool/` | Next.js API + Plugin-Dashboard | Vercel (`ab-tool-pied.vercel.app`) |
| `ab-spike/` | Demo-Client-Site (trägt das Snippet) | Vercel (`ab-spike.vercel.app`) |
| `figma-plugin/` | Figma-Plugin (8 Screens, TypeScript) | manuell in Figma laden |
| `chrome-extension/` | Chrome Extension (Element + Goal Picker) | manuell in Chrome laden |
| `db/migrations/` | Supabase SQL-Migrationen (nummeriert) | manuell im SQL-Editor ausführen |

## Schnellstart

```bash
npm run dev:tool    # ab-tool auf localhost:3000
npm run dev:spike   # ab-spike auf localhost:3001
npm run build:all   # alle Pakete bauen
```

## Migrationen

SQL-Dateien in `db/migrations/` in aufsteigender Reihenfolge im
[Supabase SQL-Editor](https://supabase.com/dashboard/project/_/sql/new) ausführen.
