# GOTOMARKET.md — variante

Stand: 08.07.2026. Phase 0 abgeschlossen. Figma-Plugin eingereicht, Chrome-Extension deprecated (Picker jetzt direkt im Snippet). Dogfooding gestartet.

## Strategie in einem Satz
**Figma-Community-Plugin = Burggraben + PLG-Engine.** Dort sitzt die Zielgruppe, organische Discovery, ~0 CAC. Alles Gewicht zuerst dorthin — bevor SEO, Ads oder sonst was.

## Positionierung
**„A/B-Test für deine KI-gebaute Website — direkt aus Figma."**
Spitze ICP: Designer/Agenturen, die ihr eigenes Design per KI in eine Site übertragen, auf Plattformen **ohne** natives A/B (Custom HTML, WordPress, Next/React, Shopify). Nicht gegen Webflow/Framer/Wix positionieren — die haben A/B schon + sperren `<head>`.

## Viraler Loop (das eigentliche Wachstum)
Free-Tier trägt **„powered by variante"-Badge** auf der Kundenseite → deren Besucher (oft selbst Designer/Gründer) sehen es → Install. Badge-aus ist der Pro-Trigger. Der Loop ist wichtiger als jeder bezahlte Kanal — Onboarding muss den User schnell zum **ersten Live-Test** bringen (Aha = Badge geht live).

---

## Phasen

### ✅ Phase 0 — Pre-Launch-Fundament (abgeschlossen 29.06.2026)

| Item | Status |
|---|---|
| Domain `getvariante.com` gesichert | ✅ |
| Landing-Page live (Hero, How It Works, Use Cases, Pricing, Notify) | ✅ |
| Signup + Login + Dashboard + Stripe scharf | ✅ |
| Steuer-Setup geklärt (Kleinunternehmer, Stripe Tax) | ✅ |
| Figma-Plugin gebaut + Community-Listing eingereicht | ✅ |
| Chrome-Extension gebaut + CWS-Listing LIVE | ✅ → ⚠️ **Deprecated (08.07.2026)** — Picker jetzt im Snippet |
| Phase A+B+C implementiert (Quick Wins, UX, Gesamt-Übersicht) | ✅ |
| Produktion auf `www.getvariante.com` deployed | ✅ |
| E2E-Test auf echter Site | ✅ M1 abgeschlossen |
| Dogfooding: variante auf eigener Landing-Page | ✅ ab.js im Root-Layout |

### Phase 1 — Soft-Launch / Design-Partner (Cold-Start lösen)
**Start: 29.06.2026 — Ziel: 1. August 2026**

Engpass: Figma-Plugin-Review. Element-Picker ist jetzt direkt im Snippet (keine Extension nötig) — aktive Schritte:

- **Chrome-Extension ist deprecated** — Picker-Funktionalität lebt jetzt im `ab.js`-Snippet. Figma-Plugin-Review noch offen.
- **Die 2 bekannten Designer + 3–5 handverlesene kleine Agenturen** als Design-Partner gewinnen: kostenlos Pro gegen Feedback + Testimonial + Case-Study.
- **Concierge-Onboarding**: du machst den ersten Test mit ihnen via einer schnellen Demo-Seite oder deren echter Site.
- **Output:** 3–5 echte Installs, **1–2 Case-Studies mit Before/After-Lift-Zahlen** → Munition für Phase 2.

### Phase 2 — Public-Launch-Spike (nach Store-Freigabe)

Erst wenn Figma-Plugin LIVE im Community Store ist:
- **Figma Community** veröffentlichen (der Burggraben).
- **Product Hunt** in derselben Woche (Dienstag) — Reichweiten-Spike. Demo-GIF + Case-Studies aus Phase 1 als Aufhänger. Design-Partner + Hockey-Netz für Upvotes/Kommentare mobilisieren.
- Ziel: Top-Plugin-Sichtbarkeit in der Figma-Suche für „A/B test".
- **Aktueller Haken:** Phase-A/B/C-Features sind deployed, aber erst nach Store-Freigabe nutzbar.

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

## Aktueller Status (08.07.2026)

- ✅ **Produkt fertig**: Phase A+B+C auf `www.getvariante.com` deployed
- ✅ **E2E-Test**: M1 abgeschlossen — kompletter Loop auf Fremd-Site getestet
- ✅ **Figma-Plugin-Review**: Eingereicht
- ⚠️ **Chrome-Extension**: Deprecated — Picker jetzt direkt im Snippet
- ✅ **Dogfooding**: ab.js im Root-Layout integriert, Badge sichtbar
- ⏳ **Design-Partner**: 0 von 5 an Bord

**Nächster Schritt:** Figma-Store-Freigabe abwarten, dann Design-Partner-Onboarding.

## Risiken
- **Cold Start** (nur 2 Kontakte) → Phase 1 ist der kritische Schritt; Figma-Community skaliert, braucht aber Review + Ranking-Zeit.
- **Plattform-Hürde** `<head>`-Zugriff → Onboarding muss pro Plattform klare Einbau-Anleitung zeigen, sonst Drop-off vor dem Aha.
- **Review-Zeiten** Figma → früh eingereicht, warten auf Freigabe. Chrome ist durch.
