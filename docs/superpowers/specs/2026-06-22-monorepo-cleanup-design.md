# Design: Monorepo-Cleanup & Strukturbereinigung

**Datum:** 2026-06-22
**Status:** Approved

---

## Ziel

Das AB-Test-Projekt von einem Git-Submodul-Setup in ein flaches Monorepo überführen und dabei alle bekannten technischen Inkonsistenzen beheben. Ergebnis: eine Struktur, die auf einen Blick verständlich ist und fehlerfrei läuft.

---

## Abschnitt 1: Neue Verzeichnisstruktur

```
AB-Test/                        ← Monorepo-Root
├── package.json                ← Root-Scripts: build:all, dev:tool, dev:spike
├── .gitignore
├── README.md
│
├── ab-tool/                    ← Next.js API + Dashboard
│   ├── package.json
│   ├── app/
│   │   ├── api/                ← alle API-Routen
│   │   └── results/
│   ├── public/
│   │   └── ab.js               ← einzige Quelle für /ab.js
│   ├── lib/
│   └── proxy.ts
│
├── ab-spike/                   ← Demo-Client-Site
│   └── app/
│
├── chrome-extension/           ← Plain-JS, kein Build-Schritt
│   ├── manifest.json
│   ├── content.js
│   ├── popup.js
│   ├── background.js
│   ├── popup.html
│   └── README.md               ← Anleitung "In Chrome laden"
│
├── figma-plugin/               ← TypeScript, minimaler esbuild
│   ├── package.json            ← build-Script via esbuild
│   ├── src/
│   │   ├── code.ts
│   │   └── ui.html
│   └── dist/                   ← Build-Output (committed)
│
└── db/                         ← einziger Ort für alle DB-Dateien
    └── migrations/
        ├── 001_schema.sql
        ├── 002_migrate_v1_to_v2.sql
        └── 003_goal_candidates.sql
```

**Entfällt:** `supabase/`, `migrations/` (konsolidiert in `db/migrations/`), `.gitmodules`, Submodul-Referenzen.

---

## Abschnitt 2: Technische Bug-Fixes

| # | Datei | Problem | Fix |
|---|-------|---------|-----|
| 1 | `ab-tool/app/ab.js/route.ts` | Unerreichbar — `public/ab.js` hat Vorrang in Next.js | Datei löschen |
| 2 | `supabase/` + `migrations/` | Zwei Ordner für dasselbe, `goal_candidates` doppelt | In `db/migrations/` konsolidieren |
| 3 | `DEPLOY_VERSEL.md` | Tippfehler im Dateinamen | → `DEPLOY_VERCEL.md` |
| 4 | `db/migrations/001_schema.sql` (ehem. `supabase/schema.sql`) | `paused` fehlt im Status-Kommentar | Kommentar: `-- draft \| active \| paused \| done` |
| 5 | `ab-tool/app/api/results/[id]/route.ts` | Einzige Route ohne `corsHeaders` | CORS-Header hinzufügen |
| 6 | `ab-tool/app/api/event/route.ts` | Conversions auf pausierten Tests werden gezählt | Guard: Status `paused` prüfen → 409 |

---

## Abschnitt 3: Submodul-Auflösung (Option 3a)

Beide Submodule (`ab-spike`, `ab-tool`) haben je 2 Commits: einen `create-next-app`-Boilerplate und einen Feature-Commit. Die inhaltliche History ist bereits im Parent-Repo-Commit `39a1ea8` dokumentiert. Kein Mehrwert durch History-Erhalt.

**Vorgehen:**
1. Submodul-Inhalte in temporäre Ordner sichern
2. `git submodule deinit --force ab-spike ab-tool`
3. `git rm ab-spike ab-tool`
4. `.gitmodules` löschen
5. Inhalte zurückkopieren
6. Als normale Verzeichnisse committen

---

## Abschnitt 4: Root `package.json` Scripts

```json
{
  "scripts": {
    "dev:tool":  "cd ab-tool && npm run dev",
    "dev:spike": "cd ab-spike && npm run dev",
    "build:all": "cd ab-tool && npm run build && cd ../ab-spike && npm run build && cd ../figma-plugin && npm run build"
  }
}
```

---

## Abschnitt 5: `figma-plugin/package.json` (minimal)

```json
{
  "name": "figma-plugin",
  "scripts": {
    "build": "esbuild src/code.ts --bundle --outfile=dist/code.js --target=es6"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "@figma/plugin-typings": "latest"
  }
}
```

---

## Abschnitt 6: `chrome-extension/README.md`

Kurze Anleitung:
1. Chrome öffnen → `chrome://extensions`
2. "Entwicklermodus" aktivieren
3. "Entpackte Erweiterung laden" → Ordner `chrome-extension/` wählen
4. Bei Änderungen an `.js`-Dateien: Extension-Seite neu laden

---

## Nicht im Scope

- npm workspaces (kein Overkill für Solo-Projekt)
- Turbo / Nx
- Shared `devDependencies` im Root
- CI/CD-Änderungen
