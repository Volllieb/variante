# Monorepo-Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Git-Submodule auflösen, technische Bugs beheben und ein klares flaches Monorepo mit Root-Scripts anlegen.

**Architecture:** Alle Pakete leben als gewöhnliche Unterordner im Parent-Repo. Migrations wandern in `db/migrations/` (nummeriert). Bugs werden in der Reihenfolge ihres Risikos behoben — erst Datei-Konflikte, dann Logik-Fehler.

**Tech Stack:** Git, Next.js 16, TypeScript, Supabase, esbuild

---

## Dateiübersicht

| Aktion | Pfad |
|--------|------|
| Entfernen | `ab-tool/app/ab.js/route.ts` |
| Entfernen | `ab-tool/supabase/` (3 SQL-Dateien) |
| Entfernen | `ab-tool/migrations/` (1 SQL-Datei) |
| Erstellen | `db/migrations/001_schema.sql` |
| Erstellen | `db/migrations/002_migrate_v1_to_v2.sql` |
| Erstellen | `db/migrations/003_goal_candidates.sql` |
| Umbenennen | `ab-tool/DEPLOY_VERSEL.md` → `ab-tool/DEPLOY_VERCEL.md` |
| Bearbeiten | `db/migrations/001_schema.sql` (Kommentar) |
| Bearbeiten | `ab-tool/app/api/results/[id]/route.ts` (CORS) |
| Bearbeiten | `ab-tool/app/api/event/route.ts` (paused-Guard) |
| Erstellen | `package.json` (Root) |
| Erstellen | `chrome-extension/README.md` |

---

## Task 1: Submodule zu normalen Ordnern machen

**Kontext:** `ab-spike` und `ab-tool` sind als Git-Gitlinks (mode 160000) im Index, aber `.gitmodules` fehlt. Inhalt liegt bereits auf Disk.

**Files:**
- Modify: `.git/config` (via git-Befehle)
- Remove gitlinks: `ab-spike`, `ab-tool` aus dem Index

- [ ] **Schritt 1: Inhalt in temporäre Ordner sichern**

```bash
cp -r ab-spike/. /tmp/ab-spike-bak
cp -r ab-tool/. /tmp/ab-tool-bak
```

- [ ] **Schritt 2: Gitlinks aus dem Index entfernen**

```bash
git rm -rf --cached ab-spike ab-tool
```

Erwartete Ausgabe: `rm 'ab-spike'` und `rm 'ab-tool'` (keine Fehlermeldung)

- [ ] **Schritt 3: Verzeichnisse aus Working Tree löschen**

```bash
rm -rf ab-spike ab-tool
```

- [ ] **Schritt 4: Inhalt zurückkopieren (ohne .git-Verzeichnis)**

```bash
cp -r /tmp/ab-spike-bak ab-spike
cp -r /tmp/ab-tool-bak ab-tool
rm -rf ab-spike/.git ab-tool/.git
```

- [ ] **Schritt 5: Backup aufräumen**

```bash
rm -rf /tmp/ab-spike-bak /tmp/ab-tool-bak
```

- [ ] **Schritt 6: Prüfen ob ab-spike und ab-tool jetzt normale Dateien sind**

```bash
git ls-files --stage ab-spike ab-tool | head -3
```

Erwartete Ausgabe: **leer** (noch nicht gestaged) — kein `160000`-Eintrag mehr.

```bash
git status --short | head -10
```

Erwartete Ausgabe: Viele `??`-Zeilen für `ab-spike/` und `ab-tool/` — keine Submodul-Markierung.

- [ ] **Schritt 7: Als normale Verzeichnisse stagen und committen**

```bash
git add ab-spike ab-tool
git commit -m "chore: dissolve submodules into flat monorepo"
```

---

## Task 2: Tote Route `app/ab.js/route.ts` löschen

**Kontext:** In Next.js hat `public/ab.js` Vorrang vor `app/ab.js/route.ts`. Die Route ist unerreichbar. `public/ab.js` ist die einzige Quelle.

**Files:**
- Delete: `ab-tool/app/ab.js/route.ts`

- [ ] **Schritt 1: Datei löschen**

```bash
git rm ab-tool/app/ab.js/route.ts
```

- [ ] **Schritt 2: Prüfen dass public/ab.js noch vorhanden ist**

```bash
ls ab-tool/public/ab.js
```

Erwartete Ausgabe: `ab-tool/public/ab.js`

- [ ] **Schritt 3: Committen**

```bash
git commit -m "fix: remove dead app/ab.js/route.ts (public/ab.js takes precedence)"
```

---

## Task 3: Migrationen in `db/migrations/` konsolidieren

**Kontext:** Es gibt zwei Quellordner (`ab-tool/supabase/` und `ab-tool/migrations/`) mit insgesamt 4 SQL-Dateien, davon ist `goal_candidates` doppelt. Ziel: ein einziger Ordner `db/migrations/` im Repo-Root mit nummerierten Dateien.

**Files:**
- Create: `db/migrations/001_schema.sql` (aus `ab-tool/supabase/schema.sql`)
- Create: `db/migrations/002_migrate_v1_to_v2.sql` (aus `ab-tool/supabase/migrate.sql`)
- Create: `db/migrations/003_goal_candidates.sql` (aus `ab-tool/supabase/migrate-v2-1.sql`, das Duplikat in `ab-tool/migrations/` entfällt)
- Delete: `ab-tool/supabase/`
- Delete: `ab-tool/migrations/`

- [ ] **Schritt 1: `db/migrations/` anlegen und Dateien kopieren**

```bash
mkdir -p db/migrations
cp ab-tool/supabase/schema.sql       db/migrations/001_schema.sql
cp ab-tool/supabase/migrate.sql      db/migrations/002_migrate_v1_to_v2.sql
cp ab-tool/supabase/migrate-v2-1.sql db/migrations/003_goal_candidates.sql
```

- [ ] **Schritt 2: Status-Kommentar in `001_schema.sql` aktualisieren**

Öffne `db/migrations/001_schema.sql` und ändere die Zeile:

```sql
  status         text default 'draft',                   -- draft | active | done
```

zu:

```sql
  status         text default 'draft',                   -- draft | active | paused | done
```

- [ ] **Schritt 3: Alte Ordner entfernen**

```bash
git rm -rf ab-tool/supabase ab-tool/migrations
```

- [ ] **Schritt 4: Neue Dateien stagen**

```bash
git add db/migrations/
```

- [ ] **Schritt 5: Prüfen**

```bash
ls db/migrations/
```

Erwartete Ausgabe:
```
001_schema.sql
002_migrate_v1_to_v2.sql
003_goal_candidates.sql
```

- [ ] **Schritt 6: Committen**

```bash
git commit -m "chore: consolidate migrations into db/migrations/ (numbered)"
```

---

## Task 4: `DEPLOY_VERSEL.md` umbenennen

**Files:**
- Rename: `ab-tool/DEPLOY_VERSEL.md` → `ab-tool/DEPLOY_VERCEL.md`

- [ ] **Schritt 1: Umbenennen via git mv**

```bash
git mv ab-tool/DEPLOY_VERSEL.md ab-tool/DEPLOY_VERCEL.md
```

- [ ] **Schritt 2: Committen**

```bash
git commit -m "fix: rename DEPLOY_VERSEL.md to DEPLOY_VERCEL.md (typo)"
```

---

## Task 5: CORS zu `results/[id]` Route hinzufügen

**Kontext:** Alle anderen API-Routen in `ab-tool` nutzen `corsHeaders` und `preflight`. `app/api/results/[id]/route.ts` ist die einzige Ausnahme.

**Files:**
- Modify: `ab-tool/app/api/results/[id]/route.ts`

- [ ] **Schritt 1: Datei ersetzen**

Ersetze den gesamten Inhalt von `ab-tool/app/api/results/[id]/route.ts` mit:

```typescript
import { getExperimentStats } from '@/lib/getExperimentStats'
import { corsHeaders, preflight } from '@/lib/cors'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getExperimentStats(id)
  if (!data) return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  return Response.json(data, { headers: corsHeaders('GET, OPTIONS') })
}
```

- [ ] **Schritt 2: Committen**

```bash
git add ab-tool/app/api/results/
git commit -m "fix: add CORS headers to results/[id] route"
```

---

## Task 6: Paused-Guard in Event-Route

**Kontext:** `/api/event` zählt Conversions auch für Tests mit `status = 'paused'`. Der `ab_convert`-RPC läuft auf `snippet_key`, kennt aber den Status. Lösung: Status vor dem RPC-Aufruf prüfen.

**Files:**
- Modify: `ab-tool/app/api/event/route.ts`

- [ ] **Schritt 1: Status-Check vor RPC einfügen**

Ersetze den Block nach der Validierung von `testId/variant/event` (ab `const { data, error } = await supabase.rpc(...)`) mit folgendem — der gesamte Dateiinhalt:

```typescript
import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { calcSignificance, determineWinner } from '@/lib/significance'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

type TestRow = {
  id: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
}

export async function POST(req: Request) {
  let body: { testId?: string; variant?: string; event?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, variant, event } = body

  if (!testId || (variant !== 'A' && variant !== 'B') || event !== 'conversion') {
    return Response.json(
      { error: 'testId, variant (A|B) und event=conversion sind Pflicht' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Paused-Guard: Conversions auf pausierten Tests nicht zählen.
  const { data: testMeta } = await supabase
    .from('tests')
    .select('status')
    .eq('snippet_key', testId)
    .single()

  if (testMeta?.status === 'paused') {
    return Response.json({ error: 'test is paused' }, { status: 409, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_convert', { p_key: testId, p_variant: variant })

  if (error) {
    console.error('[event] rpc error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  const row = data as TestRow | null
  if (!row || !row.id) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  const significance = calcSignificance(
    row.visitors_a,
    row.conversions_a,
    row.visitors_b,
    row.conversions_b
  )
  const winner = determineWinner(
    significance,
    row.conversions_a,
    row.conversions_b,
    row.visitors_a,
    row.visitors_b
  )

  const { error: updateError } = await supabase
    .from('tests')
    .update({ significance, winner, status: winner ? 'done' : undefined })
    .eq('id', row.id)

  if (updateError) {
    console.error('[event] significance update error:', updateError)
  }

  return Response.json({ ok: true }, { headers: corsHeaders('POST, OPTIONS') })
}
```

- [ ] **Schritt 2: Committen**

```bash
git add ab-tool/app/api/event/route.ts
git commit -m "fix: skip conversion counting for paused tests (409)"
```

---

## Task 7: Root `package.json` anlegen

**Files:**
- Create: `package.json`

- [ ] **Schritt 1: Datei erstellen**

Erstelle `package.json` im Repo-Root:

```json
{
  "name": "ab-test-monorepo",
  "private": true,
  "scripts": {
    "dev:tool":   "cd ab-tool && npm run dev",
    "dev:spike":  "cd ab-spike && npm run dev",
    "build:tool":  "cd ab-tool && npm run build",
    "build:spike": "cd ab-spike && npm run build",
    "build:plugin": "cd figma-plugin && npm run build",
    "build:all":   "npm run build:tool && npm run build:spike && npm run build:plugin"
  }
}
```

- [ ] **Schritt 2: Committen**

```bash
git add package.json
git commit -m "chore: add root package.json with monorepo scripts"
```

---

## Task 8: `chrome-extension/README.md` anlegen

**Files:**
- Create: `chrome-extension/README.md`

- [ ] **Schritt 1: Datei erstellen**

Erstelle `chrome-extension/README.md`:

```markdown
# Chrome Extension — AB-Testing

Kein Build-Schritt nötig. Die Extension besteht aus Plain-JS-Dateien.

## In Chrome laden

1. Chrome öffnen und `chrome://extensions` aufrufen
2. **Entwicklermodus** (oben rechts) aktivieren
3. **"Entpackte Erweiterung laden"** klicken
4. Diesen Ordner (`chrome-extension/`) auswählen

## Bei Änderungen

Nach jeder Änderung an `.js`-Dateien auf `chrome://extensions` die Extension
neu laden (Reload-Symbol ↺ auf der Extension-Karte).

## Dateien

| Datei | Zweck |
|-------|-------|
| `manifest.json` | Extension-Konfiguration (Permissions, Entry Points) |
| `content.js` | Läuft auf der Client-Site: Element-Picker + Goal-Picker |
| `background.js` | Service Worker: koordiniert Popup ↔ Content |
| `popup.html` / `popup.js` | Popup-UI der Extension |
```

- [ ] **Schritt 2: Committen**

```bash
git add chrome-extension/README.md
git commit -m "docs: add chrome-extension README with load instructions"
```

---

## Task 9: Root `README.md` anlegen

**Files:**
- Create: `README.md`

- [ ] **Schritt 1: Datei erstellen**

Erstelle `README.md` im Repo-Root:

```markdown
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
```

- [ ] **Schritt 2: Committen**

```bash
git add README.md
git commit -m "docs: add root README with monorepo overview"
```

---

## Abschluss-Verifikation

- [ ] `git log --oneline -10` — alle 9 Commits sind sauber
- [ ] `git status` — Working Tree clean
- [ ] `git ls-files --stage ab-spike ab-tool | grep 160000` — **kein Ergebnis** (keine Gitlinks mehr)
- [ ] `ls db/migrations/` — 3 nummerierte SQL-Dateien
- [ ] `ls ab-tool/app/ab.js/` — **Fehler** (Ordner existiert nicht mehr)
- [ ] `ls ab-tool/supabase ab-tool/migrations` — **Fehler** (beide entfernt)
- [ ] `cat ab-tool/DEPLOY_VERCEL.md | head -1` — korrekte Schreibweise
