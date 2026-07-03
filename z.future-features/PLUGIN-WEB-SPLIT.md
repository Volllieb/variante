# Plugin / Web — Arbeitsteilung

Status: ✅ Schritt 1 & 3 (Plugin + Doku) · ⬜ Schritt 2 (Web-Dashboard, optional)

Stand: 03.07.2026.

---

## ✅ Schritt 1: Plugin eindampfen (erledigt 03.07.2026)

- [x] `s-results`-HTML-Block entfernt
- [x] `startResults()`, `stopResultsPoll()`, `resTimer`-Logik entfernt
- [x] `setResBg()`, `pct()` Results-Preview-Funktionen entfernt
- [x] `navHistory` von Results-Referenzen gesäubert
- [x] "View Results →" → `window.open('.../dashboard')`
- [x] `dash-stats`-HTML-Block entfernt
- [x] Upgrade-Banner aus Dashboard + Generate entfernt, durch `#plan-chip` ersetzt
- [x] CSS-Regeln für entfernte Elemente aufgeräumt

## ⬜ Schritt 2: Web-Dashboard ergänzen (optional, nicht kritisch)

- [ ] Stats-Bar (Total/Active/Done) in `DashboardClient.tsx` — Daten sind schon da, nur UI fehlt
- [ ] Upgrade-Banner zentralisieren (ein Ort statt verstreut)

## ✅ Schritt 3: PROJEKT.md fortschreiben (erledigt 03.07.2026)

- [x] §8 Historie: Eintrag hinzugefügt
- [x] §3 Repository-Struktur: bereits korrekt ("6 Screens, Creation only")

---

## Prinzip

**Plugin = Creation. Web = Analysis.**

- Designer leben in Figma → Test-Erstellung passiert im Plugin.
- Stats, Vergleich, Entscheidungen brauchen Platz → passiert im Web-Dashboard.
- Pattern: Vercel, Linear, Netlify — native Integration für den täglichen Flow, Web-App für Deep Work.

---

## Plugin — Creation Only

### Was bleibt (6 Screens)

| Screen | Inhalt |
|---|---|
| **Dashboard** | Test-Liste (Name, Status-Badge), "New Test"-Button |
| **Setup** (1/6) | Test-Name, Site-URL |
| **Element** (2/6) | Browser-Extension-Picker, Waiting/Done-State |
| **Design** (3/6) | Figma-Layer für Variant B auswählen |
| **Metric** (4/6) | Goal-Auswahl + Custom CSS-Selector (Advanced-Toggle) |
| **Generate** (5/6) | KI-Generierung, A/B-Preview, Light/Dark-Toggle, Refine-Overlay |
| **Snippet** (6/6) | Copy Prompt, Copy Snippet, **"Open in Dashboard →"** (externer Link) |

### Was rausfliegt

| Entfernen | Grund |
|---|---|
| **Results-Screen** (`s-results`) | A/B-Tabelle, Significance, Live-Preview, Winner — alles auf 320×560px ist Quälerei. Gehört ins Web. |
| **Stats-Bar** (`dash-stats`: Total/Active/Done) | Nette Spielerei, irrelevant im Plugin. Checkt man im Web. |
| **Upgrade-Banner** (Dashboard + Generate) | Blockiert wertvollen Platz im engen Panel. Ein dezenteres Badge/Chip reicht. |

### Was angepasst wird

| Änderung | Details |
|---|---|
| "View Results →" → "Open in Dashboard →" | `window.open('https://www.getvariante.com/dashboard')` statt `navPush('results')` |
| Dashboard: Upgrade-Banner durch dezenten Badge ersetzen | z. B. "Free · 1/1" als Chip neben dem Titel |
| `navHistory`-Logik um Results bereinigen | Kein `navPush('results')` mehr, keine `startResults()`-Referenzen |

### Was explizit drin bleibt

- **Custom CSS-Selector** (Advanced-Toggle in Metric): Setup-Entscheidung, gehört in den Creation-Moment. Collapsible hält es aus dem Weg für Einsteiger.
- **Refine-Overlay** (Generate): Teil des Creation-Flows. Ohne Refine würde jeder Fehlgenerierung einen kompletten Neustart erfordern.
- **A/B- und Light/Dark-Toggle** (Generate-Preview): Designer wollen sehen, was sie bekommen — bevor sie es installieren.

---

## Web-Dashboard — Analysis & Management

### Bereits vorhanden (bleibt)

| Bereich | Inhalt |
|---|---|
| Test-Übersicht | Running/Won/Ended-Badges, avg Lift, Winner, Live-Suche |
| Results-Detail | A/B-Tabelle, Visitors, Conversions, CR, Significance, Lift, Winner |
| Pause/Resume | Button + Status-Wechsel |
| HTML-Editor | Textarea mit Save/Cancel, "+ Add Variant B HTML"-Fallback |
| Winner-Config | min_visitors, min_uplift, Kriterien |
| Billing | Stripe Checkout/Portal |
| Account | Plugin-Token, Usage, Plan-Badge |
| Sidebar | Navigation (Tests aktiv, Activity log/Domains „Soon", Analytics/Team gesperrt) |

### Was dazukommt (durch Plugin-Reduktion)

| Neu im Web | Grund |
|---|---|
| Stats-Bar (Total/Active/Done) | War im Plugin; gehört ins Web — mehr Platz, sinnvoller Kontext |
| Upgrade-Banner (zentral, ein Ort) | Statt verstreut in Plugin-Screens: ein Banner im Dashboard, eins in den Results |

---

## Umsetzungsplan

### Schritt 1: Plugin eindampfen

1. `s-results`-HTML-Block entfernen
2. `startResults()`, `stopResultsPoll()`, `resTimer`-Logik entfernen
3. `setResBg()` und Results-Preview-Funktionen entfernen
4. `navHistory` von Results-Referenzen säubern
5. "View Results →"-Button → `window.open('.../dashboard')`
6. `dash-stats`-HTML-Block entfernen
7. Upgrade-Banner aus Dashboard + Generate entfernen, durch Chip/Badge ersetzen
8. CSS-Regeln für entfernte Elemente aufräumen (keine Toten)

### Schritt 2: Web-Dashboard ergänzen (optional, nicht kritisch)

1. Stats-Bar (Total/Active/Done) in `DashboardClient.tsx` — Daten sind schon da
2. Upgrade-Banner zentralisieren (ein Ort statt verstreut)

### Schritt 3: PROJEKT.md fortschreiben

- §3 Repository-Struktur: Plugin-Beschreibung anpassen ("3 Screens" → "6 Screens, Creation only")
- Ggf. neue Migration, wenn Schema-Änderungen nötig

---

## UX-Fluss nach dem Split

```
Designer in Figma
  → Plugin öffnen
  → "+ New Test" → Setup → Element → Design → Metric → Generate → Snippet
  → "Open in Dashboard" → Browser-Tab mit voller Results-Ansicht
  → Pause/Resume, Edit HTML, Winner checken
  → Nächster Test: zurück ins Plugin
```

Kein Hin-und-her während der Erstellung. Ein Wechsel, genau einmal, am Ende.

---

## Risiken & Offene Fragen

- **Figma-Plugin-Update-Review**: Jede Plugin-Änderung muss durch Figmas Review. Entfernen von Screens = kleineres Bundle = einfacherer Review? Vermutlich ja, aber nicht garantiert.
- **Breaking Change für bestehende Nutzer?** Aktuell null Nutzer (Pre-Launch). Kein Migrations-Risiko.
- **Direkter Deep-Link**: `window.open` auf `/dashboard` reicht für MVP. Später: Deep-Link auf den gerade erstellten Test (`/results/[id]`).
