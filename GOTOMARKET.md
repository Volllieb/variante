# GOTOMARKET.md — variante

Stand: 10.07.2026. 🎉 Figma-Plugin LIVE im Community Store. Phase 0+1 abgeschlossen, Phase 2 (Public Launch) läuft. 1 Design-Partner angefragt. Outreach-Strategie aktualisiert: Dual-Track (Pain-Replies + Direkt-Angebote).

## Strategie in einem Satz
**Figma-Community-Plugin = Burggraben + PLG-Engine.** Dort sitzt die Zielgruppe, organische Discovery, ~0 CAC. Alles Gewicht zuerst dorthin — bevor SEO, Ads oder sonst was.

## Die ersten 10 User — was wirklich funktioniert

> **„Shipping the thing is the easy part. GTM is the boss fight."**

Die ersten 10 User kommen nicht durch breite Channels — sie kommen durch **manuelle, super-targeted Arbeit**:

1. **Eine Nische, nicht alle.** Positionier dich für „Figma-to-live-site A/B tests for landing pages" — nicht für „A/B-Testing allgemein". Die Enge gibt Glaubwürdigkeit, nicht weniger Reichweite.
2. **10–20 kalte DMs mit 30-Sekunden-Loom.** Kein Massen-Template. Zeig ihre echte Website im Video, sag exakt was du testen würdest, warum, und wie lange das Setup dauert (5 Minuten). Das konvertiert 10× besser als jeder generische Pitch.
3. **Ersten Test gratis aufsetzen.** Nicht „kostenloser Account" — du setzt den ersten Test FÜR sie auf. Danach gehört ihnen der Test + die Screenshots. Case Studies entstehen hier, nicht später.
4. **Case Studies + Screenshots → alles andere.** Product Hunt, Community-Posts, LinkedIn — alles wird aus diesen ersten 2–3 Case Studies gefüttert. Ohne die: nur Lärm.

### Cold-DM-Template (Loom-basiert)

```
Subject: Quick Loom re: [ihre-site.com]

Hey [Name],

30 sec Loom attached — I ran your landing page through
our A/B tool (designers test straight from Figma, no dev).

[Loom-Link: zeigt ihre Site + 1 konkretes Test-Element]

I'd be happy to set up your first experiment for free.
Takes 5 minutes, you get the data either way.

Worth a shot?
```

## Positionierung
**„A/B-Test für deine KI-gebaute Website — direkt aus Figma."**
Spitze ICP: Designer/Agenturen, die ihr eigenes Design per KI in eine Site übertragen, auf Plattformen **ohne** natives A/B (Custom HTML, WordPress, Next/React, Shopify). Nicht gegen Webflow/Framer/Wix positionieren — die haben A/B schon + sperren `<head>`.

## Viraler Loop (das eigentliche Wachstum)
Free-Tier trägt **„powered by variante"-Badge** auf der Kundenseite → deren Besucher (oft selbst Designer/Gründer) sehen es → Install. Badge-aus ist der Pro-Trigger. Der Loop ist wichtiger als jeder bezahlte Kanal — Onboarding muss den User schnell zum **ersten Live-Test** bringen (Aha = Badge geht live).

## Produkt-Differenzierung: Opinionated Guidance

**Designer sind allergisch auf Analytics.** Sie wollen nicht „Daten analysieren" — sie wollen gesagt bekommen, was sie als nächstes testen sollen.

**„What to test next"-Checkliste** im Plugin (basierend auf Page-Goal):

| Page Goal | Was du testen solltest |
|---|---|
| **Signups / Leads** | CTA-Text („Get started" vs „Try free"), Form-Länge (3 vs 5 Felder), Social Proof-Position (above vs below fold), Hero-Headline (Benefit vs Feature) |
| **Purchases / Sales** | Preis-Darstellung (/Mo vs /Jahr), Trust-Elemente („30-day guarantee"-Badge), CTA-Farbe (Kontrast zum Background), Dringlichkeit („Only X left" vs kein Timer) |
| **Engagement / Content** | Headline-Format (Question vs Statement), CTA-Position (inline vs bottom), Lesedauer-Label („3 min read"), Related-Posts-Anzahl (3 vs 5) |

Diese Checkliste ist **kein Feature**, sondern **Positionierung**: variante ist das Tool, das dir sagt was du testen sollst — nicht nur wie. Das konvertiert Designer, die nie ein Analytics-Tool öffnen würden.

> **Evolution:** Die Checkliste ist v0. Die Vollversion ist die **Self-Improving Site Engine** (→ `z.future-features/self-improving-site-engine.md`): variante scanned die echte Site, analysiert DOM + Copy per KI, schlägt die Top-3-Tests vor, und lernt nach jedem abgeschlossenen Test dazu. Der geschlossene Loop: Scan → Test → Winner → nächster Scan (mit Kontext). Das ist der Burggraben, den kein anderes A/B-Tool hat.

## Distribution-Channels (6 Orte, Dual-Track)

**Strategie-Update (10.07.2026):** Da variante ein live Produkt mit live Figma-Plugin ist, fahren wir parallel zwei Strategien:
- **Track A — Pain-First (langfristig, Glaubwürdigkeit):** Hilfreiche Replies auf Pain-Posts, kein Pitch. Baut Reputation.
- **Track B — Direkt-Angebot (kurzfristig, User-Akquise):** In Design-/Startup-Communities direkt Early Access anbieten. Authentisch, kein Spam — Produkt existiert, Gegenwert ist klar.

| # | Kanal | Warum | Outreach-Methode |
|---|---|---|---|
| 1 | **Figma Community** | Plugin lebt dort. Suchende im Kaufmodus. | Plugin-SEO, Reviews beantworten, Forum-Threads. Auch: „New plugin for A/B testing — early feedback wanted." |
| 2 | **X/Twitter** | Designer + Indie-Hacker mit v0/Bolt/Lovable. Frustriert über fehlendes Testing. Exakt ICP. | **Track A:** Pain-Replies ohne Pitch via 5 gespeicherte Such-Queries (s.u.). **Track B:** Eigene Threads mit Early-Access-Angebot. ⚠️ `scripts/x-pain-finder.user.js` funktioniert nicht mehr (X-DOM-Änderungen) — manuelle Bookmarks stattdessen. |
| 3 | **Reddit** (r/web_design, r/WordPress, r/webdev, r/SaaS, r/startups) | 43% Web = WordPress, kein natives A/B. Startup-Subs voller „roast my LP"-Posts. | **Track A:** Pain-Replies ohne Pitch. **Track B:** Direkt-Posts: „Built an A/B tool from Figma — looking for 5 designers to try it free." |
| 4 | **Designer-Slack/Discord** | Closed Communities = hohes Vertrauen, Tool-Empfehlungen. | #tools/#feedback: Early Access anbieten, kein aggressiver Pitch. |
| 5 | **LinkedIn** | Agentur-Inhaber (3–15 MA). Entscheider mit Budget. | Connect ohne Note → DM Pain-First → Content-Posts zu Branchen-Problemen. |
| 6 | **IndieHackers / r/SaaS** | Startup-Gründer, die selbst testen wollen. „Roast my LP" = perfekter Einstieg. | Direkt-Post: „Stack: Next.js + Supabase + Stripe + Figma Plugin. Built variante. Free Pro for first 10 startups." |

**Priorisierung:** X + Reddit gleichzeitig (Track A+B). Figma läuft passiv. r/SaaS + IndieHackers opportunistisch für schnelle User-Akquise.

### X: 5 gespeicherte Such-Queries (statt Pain-Finder-Script)

Browser-Lesezeichen anlegen, 2×/Tag öffnen, durchscrollen:

| # | Such-Query | Signal |
|---|---|---|
| 1 | `"no A/B test" OR "no AB test" OR "can't test"` | 🔴 Direkte Pain |
| 2 | `"deploy and pray" OR "ship and pray" OR "shipped without testing"` | 🟠 Frust |
| 3 | `v0 landing page OR bolt.new website OR lovable site -"looks great"` | 🟡 AI-Builder |
| 4 | `figma to live OR figma to production OR "design to code" testing` | 🟡 Figma→Live |
| 5 | `"which converts better" OR "which version" OR "A or B" design` | 🔴 Entscheidungsnot |

---

## Phasen

### ✅ Phase 0 — Pre-Launch-Fundament (abgeschlossen 29.06.2026)

| Item | Status |
|---|---|
| Domain `getvariante.com` gesichert | ✅ |
| Landing-Page live (Hero, How It Works, Use Cases, Pricing, Notify) | ✅ |
| Signup + Login + Dashboard + Stripe scharf | ✅ |
| Steuer-Setup geklärt (Kleinunternehmer, Stripe Tax) | ✅ |
| Figma-Plugin gebaut + Community-Listing eingereicht | ✅ → 🎉 **LIVE (08.07.2026)** — [Plugin #1653734891132085565](https://www.figma.com/community/plugin/1653734891132085565) |
| Phase A+B+C implementiert (Quick Wins, UX, Gesamt-Übersicht) | ✅ |
| Produktion auf `www.getvariante.com` deployed | ✅ |
| E2E-Test auf echter Site | ✅ M1 abgeschlossen |
| Dogfooding: variante auf eigener Landing-Page | ✅ ab.js im Root-Layout |

### ✅ Phase 1 — Soft-Launch / Design-Partner (abgeschlossen 08.07.2026)

- **Picker direkt im `ab.js`-Snippet integriert** — kein separates Tool nötig.
- **Figma-Plugin freigegeben** — 9 Tage Review, jetzt LIVE.
- **1 Design-Partner angefragt** — Concierge-Onboarding startet.

### 🔥 Phase 2 — Public-Launch-Spike (JETZT, Ziel: Juli/August 2026)

Figma-Plugin ist LIVE — jetzt Reichweite maximieren:
- **X-Outreach (Dual-Track):** Track A: 5 gespeicherte Such-Queries (Bookmarks), 5 Replies/Tag, nur zuhören & antworten. Track B: Eigene Threads mit Early-Access-Angebot ("Built variante — A/B testing from Figma. Free Pro for early users."). Kein Pain-Finder-Script mehr nötig (X-DOM kaputt).
- **Reddit (Dual-Track):** Track A: Pain-Replies in r/web_design, r/WordPress, r/webdev. Track B: Direkt-Posts in r/SaaS, r/startups, r/web_design ("Looking for 5 designers to try it free").
- **Design-Partner onboarden** (1/5 angefragt): Concierge-Onboarding, erster Test mit ihnen durchführen. Ziel: 1–2 Case-Studies mit Before/After-Lift-Zahlen.
- **Product Hunt** (nach Case-Studies): Demo-GIF + Case-Studies. Hockey-Netz mobilisieren.
- **Figma Community** — Plugin ist bereits öffentlich, Sichtbarkeit durch Bewertungen + Keywords steigern.
- **⚠️ Kein YouTube-Erklärvideo jetzt.** Falscher Kanal (ICP nicht auf YT), Ressourcen-Falle (2–3 Tage für 0 echte Leads). Erst relevant wenn 5+ Pro-Kunden + Case-Studies → dann Demo-Video als Social Proof, nicht als Erklärung.
- **Ziel:** Top-Plugins-Sichtbarkeit für „A/B test", erste organische Installs, erster Design-Partner live.

### Phase 3 — Self-Serve-Aktivierung & Conversion
- Funnel optimieren: Install → erster Live-Test so schnell wie möglich (das ist das Aha).
- Viraler Loop läuft über das Badge.
- Free→Pro-Trigger: unbegrenzte Experimente + Badge-aus.
- Agency-Tier (White-Label) — zurückgestellt, kommt wenn erste Nachfrage da ist.

### Phase 4 — Content/SEO (sekundär)
- Erst wenn Plugin-Discovery läuft: Keywords „A/B test from Figma", „A/B testing for AI-generated websites". Posts in r/web_design, X-Design-Bubble, Designer-Slacks.
- Agency-Tier (White-Label, Multi-Site, Team-Seats) zurückgestellt.

---

## Metriken
- **North Star:** % der Installs, die einen **Live-Test starten** (Aktivierung).
- Free→Pro-Conversion · Badge-getriebene Installs (viraler Koeffizient).
- **Umsatzziel:** erste 10 zahlende (Pro) innerhalb 60–90 Tagen nach Public-Launch. Agency-Tier später.

## Aktueller Status (10.07.2026)

- ✅ **Produkt fertig**: Phase A+B+C auf `www.getvariante.com` deployed
- ✅ **E2E-Test**: M1 abgeschlossen — kompletter Loop auf Fremd-Site getestet
- 🎉 **Figma-Plugin**: LIVE im [Community Store](https://www.figma.com/community/plugin/1653734891132085565)
- ✅ **Built-in-Picker**: Element-Picker direkt im `ab.js`-Snippet integriert
- ✅ **Dogfooding**: ab.js im Root-Layout integriert, Badge sichtbar
- 🏗️ **Design-Partner**: 1 von 5 angefragt
- ⚠️ **X-Pain-Finder-Script**: Defekt (X-DOM-Änderungen) — ersetzt durch 5 manuelle Bookmark-Queries
- 📋 **Outreach-Strategie**: Dual-Track (Pain-Replies + Direkt-Angebote in Communities)

**Nächster Schritt:** 10–20 kalte Loom-DMs an AI-Builder-Designer auf X (zeigt ihre Site + was wir testen würden). Design-Partner-Onboarding mit gratis erstem Test. Reddit-Posts (r/web_design + r/SaaS) parallel. Case-Studies aus ersten 2–3 Live-Tests sammeln → Product-Hunt-Material.

## Risiken
- **Cold Start** (nur 2 Kontakte, 1 angefragt) → Design-Partner-Onboarding ist jetzt der kritische Pfad. Ohne Case-Studies kein Product-Hunt-Material.
- **Plattform-Hürde** `<head>`-Zugriff → Onboarding muss pro Plattform klare Einbau-Anleitung zeigen, sonst Drop-off vor dem Aha.
- ~~**Review-Zeiten** Figma~~ → ✅ Freigegeben nach 9 Tagen.
