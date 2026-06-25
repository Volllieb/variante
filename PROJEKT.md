# PROJEKT.md — variante (DSO)

> **DSO = Documentation Structure Overview.** Lebendes Projektdokument. Bei jeder Änderung fortschreiben, nicht ersetzen. Enthält Selbstprüfung (siehe §Prüfung).

---

## §1 Identität

| Feld | Wert |
|---|---|
| **Produktname** | variante |
| **Mission** | Designer-natives A/B-Testing — Element in Figma auswählen → KI generiert Variante B → Snippet trackt Conversions. Kein Dev nötig. |
| **ICP** | Designer & kleine Agenturen, die eigenes Design per KI in Websites übertragen — auf Plattformen **ohne** natives A/B-Testing (Custom HTML, WordPress, Next/React, Shopify). |
| **Nicht-Zielgruppe** | Webflow/Framer/Wix — haben A/B eingebaut + sperren `<head>`. |
| **Rechtsform** | Einzelunternehmen (Bayern/DE) |
| **Phase** | Post-MVP → Go-to-Market |
| **Stand** | 25.06.2026 |
| **Leitziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community PLG), nicht Produkt. |

## §2 Stack

| Komponente | Technologie | Zweck |
|---|---|---|
| API + Dashboard | Next.js 16 (App Router) | Backend + Web-UI |
| Hosting | Vercel (2 Projekte) | Deployment |
| Datenbank | Supabase (Postgres) | Tests, Events, User |
| Auth | Supabase Auth (JWT) | Login + API-Gate |
| Billing | Stripe | Abos + Checkout |
| KI-Generierung | DeepSeek API | HTML-Varianten (~0,3 ct/Call) |
| Snippet | `ab.js` (Vanilla JS) | Läuft auf Kundenseite |
| Chrome-Extension | MV3 (Vanilla JS) | Element + Goal Picker |
| Figma-Plugin | TypeScript + HTML | Plugin-UI (8 Screens) |

## §3 Repository-Struktur

```
c:\dev\variante/
├── CLAUDE.md              # Meta-Anweisungen + Prüfregeln
├── GOTOMARKET.md           # GTM-Strategie & Phasen
├── PROJEKT.md              # ← DSO (diese Datei)
├── README.md               # Kurzübersicht + Schnellstart
├── package.json            # Root-Scripts
├── .gitignore              # Ignorier-Regeln
│
├── ab-tool/                # Kernprodukt — Next.js API + Dashboard
│   ├── app/
│   │   ├── api/            # API-Routen (assign, billing, capture, event, generate, resolve, results, stripe, tests, variant)
│   │   ├── dashboard/      # Dashboard-UI
│   │   ├── login/          # Login-Seite
│   │   ├── signup/         # Signup-Seite
│   │   ├── results/[id]/   # Ergebnisse
│   │   ├── layout.tsx      # Root-Layout
│   │   └── page.tsx        # Landing-Page
│   ├── lib/                # Server-Logik (auth, cors, stats, significance, stripe, supabase)
│   └── public/ab.js        # Das Snippet
│
├── ab-spike/               # Demo-Client-Site (E2E-Tests)
│   └── app/                # layout.tsx + page.tsx
│
├── chrome-extension/       # Chrome-Extension (MV3)
│   ├── manifest.json
│   ├── content.js / background.js / popup.js / popup.html
│   ├── welcome.html
│   └── icons/
│
├── figma-plugin/           # Figma-Plugin
│   ├── manifest.json
│   └── src/ (code.ts + ui.html)
│
└── db/migrations/          # Supabase SQL (001–005)
```

## §4 Deployment

| Projekt | URL | Vercel-Name | Deploy-Methode |
|---|---|---|---|
| ab-tool | `ab-tool-pied.vercel.app` | `ab-tool` | `vercel deploy` (CLI) |
| ab-spike | `ab-spike.vercel.app` | — | `vercel deploy` (CLI) |

**Git-Remote:** `origin` → `github.com/Volllieb/variante.git` (`master`)  
**CI/CD:** Keine automatische Pipeline (kein Vercel-Git-Import eingerichtet).  
**Auto-Push:** `post-commit`-Hook pusht automatisch nach jedem Commit (siehe `.githooks/post-commit`).

## §5 Pricing

| Tier | Preis | Inhalt | Zweck |
|---|---|---|---|
| **Free** | 0 € | 1 aktives Experiment, Badge **an** | Figma-Discovery + viraler Loop |
| **Pro** | ~$35/Monat | Unbegrenzt, Badge **aus**, volle Statistik | Solo-Monetarisierung |
| **Agency** | ~$99–149/Monat | Multi-Site, White-Label, Team-Seats | **Hauptumsatz** |

**KI-Kosten:** ~0,3 ct/Call → Marge praktisch 100 %.  
**Free-Tier AI-Gen:** ✅ **Entschieden — ja.** AI-Gen auch im Free-Tier (1 Experiment). Begründung: Aha-Moment > Kosten; Kosten vernachlässigbar. Monetarisierung über *unbegrenzt + Badge-aus*, nicht über das KI-Feature selbst.

## §6 Plattform-Support

| Plattform | Snippet | Hürde |
|---|---|---|
| Custom HTML | ✅ `<head>` | — |
| WordPress | ✅ Code-Snippet-Plugin | — |
| Next.js/React | ✅ `layout.tsx` | — |
| Shopify | ✅ `theme.liquid` | — |
| Webflow | ⚠️ nur Paid | `<head>`-Zugriff |
| Framer | ❌ | Kein `<head>`-Zugriff |
| Wix/Squarespace | ❌ | Kein Custom-Script |

### Steuerklärung — was genau mit Berater besprechen

| Frage | Details |
|---|---|
| **Kleinunternehmer-Regelung (§19 UStG)** | Aktuell aktiv. Grenze: 22.000 € Vorjahresumsatz, 50.000 € laufendes Jahr. Bei USD-Preisen + skalierendem SaaS kann das schnell gekippt sein. **Frage:** Umsatzgrenze in Euro oder USD? Wechselkurs-Stichtag? |
| **Reverse-Charge / OSS** | Bei B2B-Kunden im EU-Ausland muss ggf. Reverse-Charge angewendet werden. **Frage:** Reicht Kleinunternehmer-Regelung auch bei EU-Kunden, oder braucht's OSS-Verfahren? |
| **USD-Preise** | Wir fakturieren in USD, sitzen in DE. **Frage:** Muss die Rechnung zwingend EUR ausweisen? Doppelte Preisangabe? Wechselkurs-Handhabung? |
| **Stripe Tax** | Stripe kann USt automatisch berechnen + abführen. **Frage:** Deckt das alle Fälle ab, oder braucht's zusätzlich einen Steuerberater für die Erklärung? |
| **Plattform-Umsätze** | Figma/Chrome-Web-Store zahlen ggf. Provisionen. **Frage:** Fällt das unter sonstige Einkünfte oder Betriebseinnahmen? |

**Empfehlung:** Einmaliges 30-Min-Gespräch mit Steuerberater vor Live-Schaltung. Stripe Tax kann das meiste automatisieren, aber die Grundsatzentscheidung (Kleinunternehmer ja/nein, OSS nötig?) muss vorher klar sein.

- [x] Domain gesichert: `getvariante.com`
- [x] Free-Tier AI-Gen: **ja** (entschieden)
- [x] GitHub-Remote eingerichtet: `github.com/Volllieb/variante.git`
- [ ] MVP E2E auf echter Fremd-Site getestet?
- [ ] **Steuerklärung mit Berater:** Siehe Detail unten ⤵

## §8 v4-Backlog

1. Globales CSS in Figma-Preview ohne Rendering-Fehler
2. KI-Prompt-Feld + variable Übertragungs-Genauigkeit
3. Inline- → globales CSS bei Variante B
4. Auto-Complete letzter Eingaben
5. Schnelleres Dashboard-Update
6. Pause-Button (Snapshot bei viel Traffic)
7. Gesamt-Übersicht (kumulierte Besucher/Verbesserung)
8. Auto-Auswahl Gewinner (verifizieren)
9. Konfigurierbare Gewinn-Kriterien
10. Mehrere Metriken parallel
11. Relative Verbesserung (Lift) prominenter zeigen

## §9 Historie

| Datum | Eintrag |
|---|---|
| 25.06.2026 | Cleanup: tote Dateien, Build-Artefakte, Boilerplate entfernt. DSO-Struktur eingeführt. Auto-Post-Commit-Hook + Selbstprüfung. |
| 25.06.2026 | Produktname-Korrektur: „variantt" → „variante". GitHub-Remote eingerichtet (`Volllieb/variante`). Domain `getvariante.com` eingetragen. Free-Tier AI-Gen entschieden (ja). Steuerfragen präzisiert. |
| 24.06.2026 | GTM-Strategie dokumentiert (GOTOMARKET.md). |
| 19.06.2026 | Phase 0 bestanden — Markt validiert. |
| — | MVP gebaut (Auth-Lücke). v3 Launch-Vorbereitung gestartet. |

## §10 Selbstprüfung

> **Bei JEDER Änderung an diesem Projekt prüfen:**

### 10.1 Struktur-Check
- [ ] Gibt es `node_modules/`, `.next/`, `dist/` im Git-Index? → `.gitignore` prüfen, `git rm --cached`
- [ ] Sind alle Dateien im Projekt funktional notwendig? → Unnötiges löschen
- [ ] Ist die Ordnerstruktur in §3 dieser Datei aktuell? → Sonst aktualisieren
- [ ] Entspricht der Code dem Stack in §2? → Keine vergessenen Abhängigkeiten

### 10.2 Git-Health
- [ ] Wurde diese Änderung committed? → `git status` prüfen
- [ ] Ist ein Remote vorhanden? → `git remote -v`
- [ ] Wurde gepusht? → `git log --oneline origin/master..HEAD` (nur bei Remote)
- [ ] Gibt es unversionierte Dateien, die versioniert gehören? → `git status --short`

### 10.3 Dokumentations-Health
- [ ] Ist diese Datei (PROJEKT.md) auf dem neuesten Stand? → Status, Entscheidungen, Historie
- [ ] Ist GOTOMARKET.md aktuell? → Bei Strategie-Änderungen
- [ ] Ist README.md konsistent mit der tatsächlichen Struktur? → Bei Struktur-Änderungen
- [ ] Sind Entscheidungen und Begründungen dokumentiert? → Sonst in §9 oder §7 ergänzen

### 10.4 Deployment-Health
- [ ] Funktionieren die Vercel-Deployments? → `curl`-Test auf beide URLs
- [ ] Sind Environment-Vars auf Vercel gesetzt? → Bei neuen API-Keys
- [ ] Wurden Migrationen aus `db/migrations/` ausgeführt? → Bei Schema-Änderungen

### 10.5 Produkt-Health
- [ ] Läuft der komplette Loop? → Extension → Plugin → API → Snippet → Event-Tracking
- [ ] Ist der Badge-Mechanismus intakt? → Free-Tier zeigt Badge, Pro nicht
- [ ] Funktionieren Auth + Gating? → Login, Trial, Paywall
- [ ] Sind die DeepSeek-Calls günstig? → Kosten < 1 ct/Generierung

---

*DSO — zuletzt geprüft: 25.06.2026*
