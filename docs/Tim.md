# Tim — Marketing-Briefing variante

> Stand: 16.07.2026. Komplettes Briefing für Marketing-Agenten.

---

## 🎯 Was ist variante?

Ein **autonomer KI-Agent für A/B-Testing** — kein Dev nötig. User installieren ein 14KB-JS-Snippet (`ab.js`) auf ihrer Site, und variante scannt die Seite, schlägt Tests vor, generiert Varianten per KI und misst Conversions. Dazu ein **Figma-Plugin** (live im Community Store) für Designer, die visuell Varianten bauen wollen.

**Landingpage:** `www.getvariante.com`
**Figma Plugin:** `figma.com/community/plugin/1653734891132085565`
**Pricing:** Free (1 Test, Badge) / Pro 35 €/Monat (unbegrenzt) / Agency 99 € (auf Eis)
**Rechtsform:** Einzelunternehmen, Bayern/DE, Kleinunternehmer (§19 UStG)

---

## 1. Was bisher gemacht wurde

### Reddit (Track B — Direkt-Posts)
- Einzelne Posts in relevanten Subs (`r/web_design`, `r/SaaS`, `r/startups`), vorsichtig mit Eigenwerbung ("Built an A/B tool from Figma — looking for 5 designers to try it free")
- Regel: Erst 2 Wochen aktiv kommentieren, dann posten. Reddit hasst Self-Promo.

### Persönliches Outreach (Track A — Cold DMs)
- **IndieHackers Products DB** gescreent: 44 Produkte → 17 qualified leads (7 Top-Fit, 10 Good-Fit), dokumentiert in `docs/leads.md`
- Zwei High-Potential-Leads recherchiert: **IbexAI** (Matt Bauer, $3-6K MRR) und **PostFox** (Ro, $2K MRR)
- Konkrete Site-Analyse gemacht: Seite angeschaut, ein spezifisches Element identifiziert das man testen würde
- Outreach-Template entwickelt (siehe `/memories/repo/outreach-templates.md`):
  - ≤120 Wörter, 1 konkretes Kompliment, Deal-Transparenz ("I need case studies, you get a free test"), genau 1 Test-Idee
  - Loom-basierter Ansatz geplant, aber für ersten Kontakt als zu aufwändig bewertet — Text reicht

### X/Twitter
- 5 gespeicherte Such-Queries als Bookmarks (Pain-Finder-Script ist kaputt wegen X-DOM-Änderungen)
- Dual-Track: Pain-Replies (hilfreich, kein Pitch) + eigene Threads mit Early-Access-Angebot
- Ziel: 5 Replies/Tag, 2-3×/Woche eigener Thread

### Status
- 🎉 **Erster organischer User** (13.07.2026) — Google OAuth Signup, kein Outreach, kam von selbst
- 1 Design-Partner angefragt, noch kein Onboarding abgeschlossen
- Keine Case Studies, kein Social Proof außer live Plugin + Landingpage

---

## 2. Was ist am sinnvollsten? (Strategie)

Nicht breit streuen — fokussieren auf das, was konvertiert:

| Rang | Kanal | Warum | Aufwand |
|---|---|---|---|
| **1** | **Persönliche Cold-DMs** (X, Email, Kontaktformular) | Höchste Conversion. Site-Analyse + 1 konkreter Test-Vorschlag schlägt jeden generischen Pitch | Hoch (pro Lead ~5-10 Min) |
| **2** | **Reddit: Pain-Replies** (nicht Posts) | Baut Glaubwürdigkeit, kein Self-Promo-Stigma. "Roast my LP"-Posts in r/SaaS sind Gold | Mittel (täglich 15-30 Min) |
| **3** | **X/Twitter: Pain-Replies** | Gleiche Logik, andere Zielgruppe. AI-Builder-Bubble ist hyperaktiv | Mittel (täglich 15-30 Min) |
| **4** | **Figma Community** | Passiv, aber 0 CAC. Plugin-SEO + Reviews | Gering (einmalig optimieren) |
| **5** | **IndieHackers / r/SaaS** | Direkt-Posts mit "roast my LP" als Einstieg | Gering (opportunistisch) |

### Nicht jetzt
- ❌ YouTube-Erklärvideo (falscher Kanal, Ressourcen-Falle)
- ❌ LinkedIn (braucht Case-Studies, längere Kaufzyklen)
- ❌ Bezahlte Ads (erst wenn Unit Economics klar sind)
- ❌ Product Hunt (braucht erst 2-3 Case-Studies)

### Kernprinzip
> Die ersten 10 User kommen durch manuelle, super-targeted Arbeit — nicht durch breite Channels. Eine Nische gibt Glaubwürdigkeit, nicht weniger Reichweite.

### Der emotionale Trigger für die Zielgruppe
Nicht "A/B-Testing ist cool" — sondern **"Endlich kann ich beweisen, dass meine Landingpage funktioniert."**

---

## 3. Zielgruppe (erweitert — nicht mehr nur Designer)

### 🅰️ Indie Hacker mit eigener Landingpage (NEU — höchste Prio jetzt)

- **Profil:** Solo-Gründer (25-40), baut SaaS/Micro-SaaS, hat eine Landingpage live
- **Stack:** Next.js, Custom HTML, v0/Bolt/Lovable, WordPress
- **Pain:** "Ich hab gelauncht, aber convertet die Page? Keine Ahnung." / "Ship and pray."
- **Budget:** $35/Monat ist irrelevant — sie zahlen $20-50/Monat für 10 andere Tools
- **Wo:** r/SaaS, r/startups, r/webdev, r/nextjs, IndieHackers, X (IndieHacker-Bubble)
- **Trigger:** "Roast my landing page"-Posts, "How do I improve conversions?"-Fragen
- **Ton:** Casual, dry, self-deprecating. Kein Corporate-Speak. "Built this solo" statt "We're revolutionizing."

### 🅱️ Designer (bestehende Zielgruppe)

- **Profil:** UI/UX-Designer (25-40), baut Landingpages für Kunden oder eigenes Produkt
- **Stack:** Figma → Custom HTML/WordPress/Next.js/Shopify
- **Pain:** "Ich designe Varianten in Figma, aber welche konvertiert besser? Keine Ahnung."
- **Wo:** r/web_design, r/figmadesign, r/WordPress, Figma Community, Designer-Slack/Discord
- **Trigger:** Figma-Plugin-Discovery, "Wie teste ich mein Design?"-Fragen

### 🅲️ WordPress-Freelancer (Volumen)

- **Profil:** Webdesigner (30-50), baut WordPress-Sites für KMUs
- **Pain:** "Kunde fragt nach A/B-Test, ich sag: zu teuer."
- **Wo:** r/WordPress, WP-Facebook-Gruppen

---

## 4. Subreddits & Foren

| Subreddit | Größe | Zielgruppe | Strategie |
|---|---|---|---|
| **r/SaaS** | 150k | Indie Hacker, Gründer | 🔥 **Priority 1.** "Roast my LP"-Posts sind perfekter Einstieg. Pain-Replies, kein eigener Post. |
| **r/web_design** | 1.2M | Designer | 🔥🔥 Pain-Replies. Erst nach 2 Wochen Aktivität eigener Post. |
| **r/startups** | 1.5M | Gründer | 🟡 Zu breit, aber gute Einzelfäden zu Conversion/Landingpages. |
| **r/nextjs** | 150k | Indie Hacker mit Next.js | 🔥 AI-Builder-Designer sind oft in Next.js. |
| **r/webdev** | 2.2M | Devs, einige Designer | 🔥 Gute Threads zu AI-Buildern, aber sehr breit. |
| **r/WordPress** | 250k | WordPress-Freelancer | 🔥 Pain-Posts zu "A/B Plugin" sind häufig. |
| **r/figmadesign** | 90k | Designer | 🔥 Designer-Hub, aber Plugin-Answers sind verpönt. Nur hilfreiche Kommentare. |
| **r/shopify** | 200k | Store-Owner | 🟡 Q4-Testing-Fragen im September erwartet. Jetzt schon reacten. |
| **r/indiehackers** (inoffiziell) | ~50k | Indie Hacker | 🟡 Wie r/SaaS, kleinere Community. |
| **IndieHackers.com** | — | Indie Hacker | 🔥 Products DB + "roast my LP"-Posts. Keine DMs mehr (abgeschafft), nur öffentliche Posts. |

### Reddit-Regel Nr. 1
Nie direkt posten, nur kommentieren. Der erste eigene Post kommt nach 2 Wochen aktiver, hilfreicher Kommentare — und dann als "Ich hab das Problem selbst erlebt, hier ist was ich gebaut hab".

---

## 5. X/Twitter: 5 gespeicherte Such-Queries

Browser-Lesezeichen anlegen, 2×/Tag öffnen, durchscrollen:

| # | Such-Query | Signal |
|---|---|---|
| 1 | `"no A/B test" OR "no AB test" OR "can't test"` | 🔴 Direkte Pain |
| 2 | `"deploy and pray" OR "ship and pray" OR "shipped without testing"` | 🟠 Frust |
| 3 | `v0 landing page OR bolt.new website OR lovable site -"looks great"` | 🟡 AI-Builder |
| 4 | `figma to live OR figma to production OR "design to code" testing` | 🟡 Figma→Live |
| 5 | `"which converts better" OR "which version" OR "A or B" design` | 🔴 Entscheidungsnot |

---

## 6. Outreach-Template (erprobt)

```
Subject: [1 konkreter Aufhänger], and a free test idea

Hey [Name],

[1 Satz echte Würdigung — zitiere oder paraphrasiere etwas,
was nur jemand weiß der die Site wirklich gelesen hat.]

[1 Satz gemeinsame Mission. "We're on adjacent missions:
you X, I help Y."]

I'm building variante, an A/B testing tool. I need case
studies. You get a free test. That's the trade.

[1 konkrete Test-Idee mit Begründung. Kein Buffet.
Eine Sache. Warum sie funktionieren könnte.]

Takes five minutes, you keep the data either way.

Worth a shot?

[Dein Name]
```

### Regeln
- **≤120 Wörter.** Mehr liest keiner.
- **Maximal 1 Kompliment.** Und nur wenn's echt ist.
- **Deal sofort klarmachen.** "I need case studies, you get a free test." Nicht erst am Ende.
- **Genau 1 Test-Idee.** Kein Buffet. Zeigt Fokus.
- **"Not selling" nicht sagen.** Wenn du nicht wie ein Verkäufer schreibst, glaubt man's auch so.
- **Keine Bindestriche, kein Marketing-Vokabular.**
- **Kein `legal@` oder Catch-All anschreiben.** Gründer über X/LinkedIn/Domain-Whois finden.

### Blöcke (Reihenfolge ist Pflicht)
1. Subject = Aufhänger + "free test idea"
2. Echte Würdigung (1 Satz)
3. Gemeinsame Mission (1 Satz)
4. Deal-Transparenz (1 Satz)
5. Konkrete Test-Idee + Begründung (2-3 Sätze)
6. Setup + Daten (1 Satz)
7. Close (1 Satz)

---

## 7. Posting-Stil (Reddit, X, Figma, Communities)

```
Write like a solo dev who'd rather build than sell. Casual,
dry, self-deprecating. Short sentences. No corporate speak,
no exclamation marks, no "excited to announce" energy.
Lead with the pain, not the product. Humor is understated
("future-me problem", "still dreaming over here").
End with genuine appreciation, not gushing.
Never polish — this is Reddit, not a pitch deck.
```

### Zusätzliche Regeln
- "Solo dev" statt "Founder", "built this" statt "launched"
- Emojis sparsam, nur wenn's den Ton unterstreicht
- Kein Verkaufs-Pitch — ehrliche Frage oder hilfreiche Antwort

### Beispiele (guter Stil)
- "Yeah, I really hate this GTM thing, would rather just build the next one haha."
- "Built this solo over 3 months. Would love honest feedback."
- "Where I'm stuck: getting the first users."

### Beispiele (schlechter Stil)
- "Check out my startup!"
- "We're revolutionizing A/B testing"
- "Excited to announce..."

---

## 8. Nächste Schritte (konkret)

### Sofort (diese Woche)

1. **Reddit-Profil aufbauen** — in r/SaaS, r/web_design, r/startups täglich 3-5 hilfreiche Kommentare schreiben. Kein Pitch, nur echte Hilfe bei Conversion-/Testing-Fragen.
2. **"Roast my LP"-Posts scouten** — in r/SaaS und r/startups nach Leuten suchen, die Feedback zu ihrer Landingpage wollen. Das sind die heißesten Leads.
3. **5 IndieHackers-Leads recherchieren** — aus `docs/leads.md` die nächsten 5 Top-Fit-Produkte: Website-URL + Gründer-Kontakt (X/LinkedIn) rausfinden.
4. **Figma-Plugin-Beschreibung optimieren** — Keywords: "ab test", "split test", "conversion", "design test", "landing page optimization".

### Kurzfristig (1-2 Wochen)

5. **Erste Cold-DMs rausschicken** — 3-5 pro Tag an die recherchierten Leads. Mit konkreter Site-Analyse, nicht generisch.
6. **Ersten Design-Partner closen** — Concierge-Onboarding: gemeinsam ersten Test durchführen. Screenshot vom Live-Test = erster Social Proof.
7. **Pain-Replies auf X** — 5 gespeicherte Such-Queries 2×/Tag checken, 5 Replies/Tag.

### Mittelfristig (2-4 Wochen)

8. **Case Study bauen** — aus dem ersten erfolgreichen Design-Partner-Test. Before/After, konkrete Zahlen.
9. **Product Hunt vorbereiten** — Demo-GIF + Case Study. Dienstag launch (bester Traffic-Tag).
10. **Reddit: Erster eigener Post** — nach 2 Wochen Aktivität: "I built an A/B testing tool for landing pages — looking for feedback."

---

## 9. Assets & Links

| Was | Wo |
|---|---|
| Produkt | `www.getvariante.com` |
| Figma Plugin | `figma.com/community/plugin/1653734891132085565` |
| Leads-DB | `docs/leads.md` (17 qualifiziert, 2 recherchiert) |
| Outreach-Templates | `/memories/repo/outreach-templates.md` |
| GTM-Strategie | `docs/GOTOMARKET.md` |
| Marktrecherche | `docs/MARKET-RESEARCH.md` |
| Posting-Stil | `/memories/posting-style.md` |
| Brand-Guidelines | `docs/brandguidelines.md` |
| Projekt-Info | `PROJEKT.md` |

---

**Kernbotschaft:** Nicht breit streuen. Der Engpass ist nicht Reichweite — es ist **Vertrauen**. Jeder Kontakt kriegt eine individuelle Site-Analyse und genau einen Test-Vorschlag. Das ist der Unterschied zwischen "noch ein A/B-Tool" und "der Typ hat sich meine Seite wirklich angeschaut."
