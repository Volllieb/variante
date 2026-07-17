# AGENTS.md — Arbeitsanweisungen variante

Nur Meta-Anweisungen. Projektinhalte, Stand und Notizen stehen in `PROJEKT.md` — dort fortschreiben, nicht hier.
Dokumentation: `docs/` (Brand, GTM, Leads, Marktrecherche, E2E, Future-Features).

**Agent-Definitionen:** `.github/agents/*.agent.md` (ponytail, redesign, supabase, stripe, deployment-expert, performance-optimizer, ai-architect, seo, wrapup).

## Arbeitsweise
- Deutsch. Kein Intro/Outro/Padding. Direkt zum Inhalt.
- Meinung statt neutraler Pros/Cons. Eine Rückfrage statt Annahmen.
- Kurze Antworten; bei komplexen Themen erst Kern, dann Details auf Nachfrage.
- Aussage mit allgemeinem Überbegriff verknüpfen
- Sei kritisch aber zuversichtlich und optimistisch. Jedes Problem sollte mit einer lösungsorientierten Haltung aufgezeigt und proaktiv angegangen werden.

## Schätzungen & Qualität
- **Keine Zeitschätzungen.** Nie "das dauert 2 Stunden" oder "in 30 Min fertig". Stattdessen: Aufwand einschätzen — "das ist trivial", "mittlerer Aufwand", "das ist aufwändig weil X, Y, Z". Begründung mitliefern, nicht nur Label.
- **Immer sauberste Version & Best Practice.** Nie Quick-and-Dirty nur weil's schneller ginge. Korrekte Typisierung, keine any-Hacks, keine ungetesteten Workarounds. Der saubere Weg ist der einzig akzeptable — außer es gibt einen expliziten Grund (z. B. bewusster Tradeoff mit Protokoll in PROJEKT.md).

## Standing Order
- **Auf Feature-Branch arbeiten** — nie direkt auf master, außer es ist ein production-ready Fix.
- **Immer alle relevanten Projektinfos speichern** → in `PROJEKT.md` fortschreiben (Stand, Entscheidungen, Brainstorms, Interview-Erkenntnisse). Lokale Tool- oder IDE-Konfigurationen bleiben frei von Projekt-Logik.
- **Nach jeder Änderung: Selbstprüfung aus §9 PROJEKT.md durchführen** — Struktur, Git, Doku, Deployment, Produkt-Health checken.
- **Immer committen** — keine losen Änderungen hinterlassen.
- **Nach jeder relevanten Aufgabe: Review → Commit → Push.** Erst prüfen was geändert wurde, dann commiten, dann sofort pushen. Was nicht gepusht ist, ist vergessen.

## Auto-Push-Regel
- Nach jedem Commit: `git push` ausführen (sofern Remote existiert).
- Ist kein Remote eingerichtet: in PROJEKT.md §7 den Punkt „GitHub-Remote einrichten" offen lassen.
- Bei erstmaligem Remote-Setup: `post-commit`-Hook aktivieren (siehe `.githooks/post-commit`).

## Build-Pflicht (seit 2026-07-15)
**Vor JEDEM Commit, der Dateien in `ab-tool/` ändert:**
1. `cd ab-tool && npm run vercel-build` ausführen.
2. Schlägt der Build fehl → Fix einbauen, Build wiederholen, ERST DANN committen.
3. Kein Commit mit rotem Build. Keine Ausnahme.
- Das schließt auch Typisierung und Linting ein (`tsc --noEmit`-Äquivalent via Next.js Build).
- Ziel: Vercel-Deployments brechen nicht mehr wegen Syntax-/Type-Errors nach Push.

## Deploy-Regel (seit 2026-07-16) — Preview-First

**Jeder Push auf master deployt automatisch nach Vercel Production.** Um das zu umgehen und Features erst in Preview zu testen:

### Täglicher Workflow
1. **Auf Feature-Branch arbeiten**, nicht auf master.
2. `git push origin feature-branch` → Vercel deployt automatisch als **Preview** (unique URL).
3. Preview testen, reviewen, ggf. iterieren.
4. **Erst wenn ready:** `vercel promote <preview-url>` → wird zur Production (instant, kein Rebuild).

### Regeln
- **Niemals direkt auf master pushen**, wenn der Commit nicht production-ready ist.
- **master = production.** Was auf master liegt, geht live. Feature-Branches = Preview.
- **Promote nur auf explizite Anweisung.** Nicht automatisch.
- Build-Pflicht gilt weiterhin: vor JEDEM Commit `npm run vercel-build`.
- Bei Build-Fehlern in Vercel: `npx vercel list` → `npx vercel inspect <url> --logs` → Fehler analysieren.

## Env-Var-Regel (seit 2026-07-17)

**Source of Truth = Vercel.** Alle Secrets leben in Vercel, niemals lokal committet.

### Dateien
| Datei | Zweck | Git? |
|---|---|---|
| `ab-tool/.env.local` | Lokale Secrets für `next dev` | **Nein** (gitignored) |
| `ab-tool/.env.example` | Doku aller benötigten Vars | **Ja** (committed) |

### Workflow
1. **Onboarding:** `cd ab-tool && vercel env pull .env.local --yes`
2. **Neue Env-Var:** `vercel env add MY_VAR production preview` → `.env.example` nachziehen → `vercel env pull .env.local --yes`
3. **Env-Var löschen:** `vercel env rm MY_VAR` → `.env.example` nachziehen
4. **Nach jedem Pull:** prüfen ob alle in `.env.example` dokumentierten Vars in `.env.local` vorhanden sind

### Regeln
- **Keine Secrets in `.env.example`** — nur leere `""` oder Default-Werte.
- **`NEXT_PUBLIC_*` nur für unkritische Werte** (URLs, Anon-Keys). Nie Secrets.
- **Vor jedem Commit prüfen:** `.env.local` ist nicht im Diff (`git status`).
- **Root `.env.local` gelöscht 17.07.2026** — einzige kanonische Datei ist `ab-tool/.env.local`.

## Prüfpflicht
Bei JEDEM Task (Code, Doku, Config):
1. **Vor dem Task:** PROJEKT.md §10 durchgehen — gibt es offene Prüfpunkte?
2. **Nach dem Task:** PROJEKT.md §10 erneut durchgehen — hat der Task neue Prüfpunkte erzeugt?
3. **Nicht bestandene Prüfung = Task nicht fertig.**
4. **Build-Pflicht:** Bei Code-Änderungen in `ab-tool/` → `npm run vercel-build` muss grün sein (s.o.).
