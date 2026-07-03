# AGENTS.md — Arbeitsanweisungen variante

Nur Meta-Anweisungen. Projektinhalte, Stand und Notizen stehen in `PROJEKT.md` — dort fortschreiben, nicht hier.

**Agent-Definitionen:** `.github/agents/*.agent.md` (ponytail, redesign, stripe).

## Arbeitsweise
- Deutsch. Kein Intro/Outro/Padding. Direkt zum Inhalt.
- Meinung statt neutraler Pros/Cons. Eine Rückfrage statt Annahmen.
- Kurze Antworten; bei komplexen Themen erst Kern, dann Details auf Nachfrage.
- Aussage mit allgemeinem Überbegriff verknüpfen
- Sei kritisch aber zuversichtlich und optimistisch. Jedes Problem sollte mit einer lösungsorientierten Haltung aufgezeigt und proaktiv angegangen werden.

## Standing Order
- **Immer alle relevanten Projektinfos speichern** → in `PROJEKT.md` fortschreiben (Stand, Entscheidungen, Brainstorms, Interview-Erkenntnisse). Lokale Tool- oder IDE-Konfigurationen bleiben frei von Projekt-Logik.
- **Nach jeder Änderung: Selbstprüfung aus §10 PROJEKT.md durchführen** — Struktur, Git, Doku, Deployment, Produkt-Health checken.
- **Immer committen** — keine losen Änderungen hinterlassen. Nach Commit: `git push` (wenn Remote vorhanden).

## Auto-Push-Regel
- Nach jedem Commit: `git push` ausführen (sofern Remote existiert).
- Ist kein Remote eingerichtet: in PROJEKT.md §7 den Punkt „GitHub-Remote einrichten" offen lassen.
- Bei erstmaligem Remote-Setup: `post-commit`-Hook aktivieren (siehe `.githooks/post-commit`).

## Prüfpflicht
Bei JEDEM Task (Code, Doku, Config):
1. **Vor dem Task:** PROJEKT.md §10 durchgehen — gibt es offene Prüfpunkte?
2. **Nach dem Task:** PROJEKT.md §10 erneut durchgehen — hat der Task neue Prüfpunkte erzeugt?
3. **Nicht bestandene Prüfung = Task nicht fertig.**
