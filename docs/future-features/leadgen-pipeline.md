# Leadgen-Pipeline — Automatisierte Outreach-Produktion

> Stand: 18.07.2026 · Status: **Planung** · Aufwand: mittel (existierende Libs, nur Verkettung fehlt)

## Kontext

Valentin sammelt Leads aus IndieHackers Products, recherchiert Kontaktdaten manuell (~5 Min/Lead), erstellt Loom-Videos mit Analyse (~5-10 Min/Lead), und schreibt personalisierte DMs. Der teuerste Teil — die Landingpage-Analyse mit Screenshots — ist bereits durch das Hybrid-Onboarding gebaut (`/api/preview`, `lib/extractPageCode.ts`, `lib/previewAnalyze.ts`, `lib/screenshot.ts`). Was fehlt, ist die Verkettung zu einem Batch-fähigen Offline-Pipeline-Script.

## Die Pipeline (5 Stufen)

```
IH-Leads sammeln → Enrichment → Analyse (existiert!) → Draft → Review → Versand
  halbautomatisch    Script       Batch-Script          GPT      DU       DU
```

### Stufe 1 — Lead-Collection (halbautomatisch)

**Problem:** IndieHackers hat keine API, ist eine SPA, Scraping = ToS-Grauzone.

**Ansatz:** `docs/leads-inbox.txt` — eine URL pro Zeile. Valentin sammelt IH-Produkt-URLs oder direkt Website-URLs beim Durchscrollen (10 Min/Woche). Alles danach läuft automatisch.

**Alternative:** Browser-Tools können Collection-Runs machen ("hol mir die nächsten 20").

### Stufe 2 — Enrichment (voll automatisierbar, ~10s/Lead)

Script pro Lead:
- Website fetchen → Cheerio parst die Seite
- E-Mail extrahieren: `mailto:`-Links, Footer-Text, /about, Impressum
- X-Handle aus Social-Links, Footer
- Founder-Name aus Meta-Tags, About-Page, Footer

**Reachability-Scoring (aus PostFox-Erfahrung):**
| Score | Kriterium |
|---|---|
| 🔥 Hoch | Aktiver X-Account (gefülltes Profil, recent posts) |
| 🟡 Mittel | LinkedIn-Profil gefunden, X inaktiv |
| 🟠 Niedrig | Nur support@ oder Contact-Form |
| 🔴 Tot | Keine Kontaktdaten, keine Socials |

Sortierung nach Score — die heißen Leads zuerst.

**Dependency:** Cheerio bereits in `extractPageCode.ts` im Einsatz. Kein neues Package.

### Stufe 3 — Analyse (existiert bereits, Batch-tauglich machen)

**⚠️ Nicht über HTTP gegen `/api/preview` in Production** — da hängen IP-Rate-Limits, Tages-Limits und Temp-Session-Anlage dran. Das würde die Prod-DB mit Preview-Tests vollmüllen.

Stattdessen: **Batch-Script importiert die Libs direkt:**
- `lib/extractPageCode.ts` → HTML/CSS + Selektoren (Option A)
- `lib/previewAnalyze.ts` → GPT-Analyse mit `changes[]` + Rationales
- `lib/screenshot.ts` → Original + Variant-PNG via urlbox

Output pro Lead: `original.png`, `variant.png`, Change-Liste mit Begründungen.
Kosten: ~$0,02/Lead (urlbox ~$0.01 + GPT-4o ~$0.01). 50 Leads ≈ $1.

**Vorbild:** `scripts/ab-bot.mjs` nutzt bereits Playwright standalone. `scripts/send-onboarding-email.ts` importiert Resend direkt. Gleiches Pattern für die Analyse-Libs.

### Stufe 4 — Personalisierter Draft (voll automatisierbar)

GPT bekommt:
- Dossier (Produkt, Founder, LP-Schwächen aus `changes[]`)
- Loom-DM-Template aus `gotomarket.md` als Stilvorlage
- Posting-Stil aus User-Memory (`posting-style.md`)

Output: `draft-dm.txt` + `draft-email.txt`.

**Harte Prompt-Regeln:**
- Max. 4 Sätze
- Genau **eine** konkrete Beobachtung von ihrer Seite (z. B. „your CTA switches between X and Y")
- Kein Marketing-Sprech
- "Solo dev who'd rather build than sell"-Ton

### Stufe 5 — Review + Versand (bewusst manuell)

**Drei Gründe gegen Automatisierung des Versands:**

1. **X-DM-Automation = Ban-Risiko.** X erkennt das zuverlässig.
2. **Resend nicht für Cold Outreach.** `email.ts` läuft über `notifications@getvariante.com` — transaktionale Domain. Cold-Beschwerden ruinieren die Reputation → Signup-Mails landen im Spam. Falls E-Mail: separates Postfach auf Subdomain, von Hand.
3. **Rechtlich:** Cold-E-Mails ohne Einwilligung in DE auch B2B UWG-kritisch. X-DMs an public-building Founder sind sicherer Kanal.

**Review kostet ~2 Min/Lead** — und ist nötig, denn eine daneben liegende KI-Analyse cold verschickt kostet Glaubwürdigkeit.

## Der eigentliche Hebel: Shareable-Preview-Link

Statt Loom-Video (5-10 Min Produktion): Eine öffentliche Seite `/p/[previewId]`, die den A/B-Toggle (Original ↔ Variant) für einen Lead rendert — mit „Claim this test →"-Button.

Die DM wird dann:
> „Ran getibex.com through my A/B tool — here's your page next to what I'd test: getvariante.com/p/abc123. Claiming it takes 30 seconds if you want it live."

Der Lead **erlebt** den Aha-Moment live, statt ein Video darüber zu schauen.

**Was schon existiert:**
- `lib/claimTests.ts` — Temp-Session-Tests einem echten User übergeben
- `preview_data` + `temp_token` in der DB
- A/B-Toggle-UI aus dem Onboarding-Flow

**Was fehlt:**
- Öffentliche Render-Seite `/p/[previewId]`
- Share-Token-Generierung in der Pipeline
- Claim-Button → Signup-Flow → `claimTempSessionTests()`

Das ersetzt die Loom-Produktion (größter Zeitfresser, 5-10 Min/Lead) durch einen generierten Link.

## Verzeichnisstruktur

```
ab-tool/scripts/leadgen/
  pipeline.ts              # Orchestrator: liest leads-inbox.txt, führt Stufe 2-4 aus
  enrich.ts                # Stufe 2: Website → Kontaktdaten + Reachability-Score (Sprint 2)
  draft.ts                 # Stufe 4: GPT generiert DM/Email-Entwurf (Sprint 2)
  
docs/leads-inbox.txt       # Eine URL pro Zeile, Pipeline-Eingabe
docs/leads/<slug>/         # Output pro Lead
  dossier.md               # Kontakte, Reachability-Score, LP-Analyse
  original.png             # Screenshot Original
  variant.png              # Screenshot mit CSS-Injection
  changes.json             # previewAnalyze-Output (changes[] + summary)
  draft-dm.txt             # X-DM-Entwurf (Sprint 2)
  draft-email.txt          # E-Mail-Entwurf (nur Fallback, Sprint 2)
  preview-link.txt         # /p/[id]-Link (Sprint 3)
```

## Implementierungs-Reihenfolge

### Sprint 1: Batch-Analyse (heute)
1. ✅ `docs/leads-inbox.txt` angelegt, erste URLs aus `docs/leads.md` eingefüllt
2. ✅ `ab-tool/scripts/leadgen/pipeline.ts` — Orchestrator: liest Inbox, ruft `extractPageCode` + `analyzePreview` + `renderSettledScreenshot` pro URL, schreibt Output
3. ✅ `tsx` als devDependency in `ab-tool/package.json`, `npm run leadgen`-Script
4. 🔜 Pipeline testen: `npm run leadgen -- --url https://www.getibex.com`

### Sprint 2: Enrichment + Draft (diese Woche)
5. `scripts/leadgen/enrich.ts` — Cheerio-basiertes Kontakt-Scraping + Reachability-Score
6. `scripts/leadgen/draft.ts` — GPT-Draft mit Stilvorlage
7. Orchestrator um Enrichment + Draft erweitern

### Sprint 3: Shareable-Preview (nächste Woche)
8. DB: `lead_previews`-Tabelle mit share_token, expires_at
9. `/p/[previewId]` — öffentliche Render-Seite mit A/B-Toggle
10. Claim-Button → Signup → `claimTempSessionTests()`
11. Pipeline generiert Share-Token und `/p/[id]`-Links

## Kosten

| Position | Pro Lead | 50 Leads |
|---|---|---|
| urlbox (2 Screenshots) | ~$0.01 | ~$0.50 |
| GPT-4o (Analyse) | ~$0.01 | ~$0.50 |
| GPT-4o-mini (Draft) | ~$0.001 | ~$0.05 |
| **Gesamt** | **~$0.02** | **~$1.05** |

## Prompt-Vorlage für Draft (Stufe 4)

```
System: You are an AI assistant helping a solo dev write outreach DMs.
Style reference (from user memory):
"Write like a solo dev who'd rather build than sell. Casual, dry, self-deprecating.
Short sentences. No corporate speak, no exclamation marks, no 'excited to announce'
energy. Lead with the pain, not the product. Humor is understated."

Template reference (from gotomarket.md):
"Hey [Name], 30 sec Loom attached — I ran your landing page through our A/B tool
(designers test straight from Figma, no dev). [One specific observation about their
site.] I'd be happy to set up your first experiment for free. Takes 5 minutes,
you get the data either way. Worth a shot?"

Your task: Write a DM draft for this founder, using their actual site analysis.
Max 4 sentences. Include exactly ONE specific, concrete observation from the
changes[] analysis. Match the solo-dev tone exactly. No polish.

Lead dossier: {dossier_json}
Site analysis: {changes_json}
```

## Risiken

- **SPA-Erkennung schlägt zu:** `extractPageCode.ts` erkennt SPAs und lehnt ab → kein Output für React/Next.js-Landingpages ohne SSR. Fallback: manuelles Dossier.
- **urlbox-Kosten bei Bulk:** 50 Leads × 2 Screenshots = 100 Renders. urlbox Free Tier deckt das nicht. → API-Key von Valentin, Kosten tracken.
- **GPT-Halluzination bei Drafts:** Falscher Founder-Name, falsche Site-Details → Review-Pflicht (Stufe 5) fängt das ab.
- **Rate-Limits:** Batch nicht parallel fahren, 1 Lead/s mit 2s Delay zwischen Leads.
