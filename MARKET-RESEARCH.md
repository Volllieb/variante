# Market Research: Wie komme ich zu meinem ersten User?

> Stand: 09.07.2026. Ziel: Erster Design-Partner → erster Pro-Kunde. Kein Theorie-Paper, sondern operationeller Plan.

---

## 1. Markt-Landschaft: Der Gap

### 1.1 A/B-Testing-Markt 2026 — ein kartelliertes Oligopol mit toter Mitte

| Segment | Tools | Preis/Jahr | Zielgruppe |
|---|---|---|---|
| **Enterprise** | Optimizely, Veyour, AB Tasty, Dynamic Yield, Monetate | $40k–$200k+ | PMs in 500+-MA-Firmen, E-Commerce-Konzerne |
| **Mid-Market** | VWO, Convert, Kameleoon | $5k–$40k | Marketing-Teams, spezialisierte CRO-Agenturen |
| **SMB/Free (tot)** | Google Optimize (☠️ Sept 2023), Mullenweg's „irgendwann" | $0 | War der einzige Gratis-Einstieg — Lücke ungefüllt |
| **Snippet-only** | Splitbee (☠️ acquired/2024), GrowthBook (OSS, dev-lastig) | $0–$200 | Devs, nicht Designer |

**Der Gap:** Zwischen „Google Optimize ist tot" und „Optimizely kostet $50k" gibt es **nichts für Designer**. Alle existierenden Tools setzen voraus: Du hast einen Dev, einen Tag-Manager, und du denkst in Traffic-Volumen. Designer denken in visuellen Varianten — die Tools sprechen eine andere Sprache.

### 1.2 Figma-Plugins: 9 Treffer, 0 echte Konkurrenten

Figma Community: 9 Plugins bei Suche „ab test". Kein einziges macht echte A/B-Tests auf Live-Sites:

| Plugin | Was es wirklich macht | Install-Base | Threat-Level |
|---|---|---|---|
| **ClarityUX** (Peak Studio) | AI Design Review + Heatmaps + „AB Testing" als Feature-Claim | 4.6k | 🟡 Medium — positionieren sich als All-in-One, aber kein Live-Testing |
| **Attention Insight** | Predictive Eye-Tracking Heatmaps (KI-generiert, nicht echt) | 78k | 🟢 None — kein A/B-Testing, nur Attention-Analyse |
| **expoze.io** | Attention-Prediction | 3.9k | 🟢 None |
| **Clueify** | Design-Feedback, kein Testing | 22k | 🟢 None |
| **Protouser** | Usability-Testing, kein A/B | 8 | 🟢 None |
| **„A/B Test your design"** (Navaneeth47) | Link-sharing mit Voting | 18 | 🟢 None — das ist Usability-Testing, kein A/B |
| **variante** | ✅ Echter A/B-Test auf Live-Site mit KI-Generierung | 1 (uns) | 🔵 Unser Burggraben |

**Fazit:** Keiner macht das, was variante macht. Die Positionierung „A/B-Testing aus Figma" ist **kategorieerschaffend, nicht kategorieeintretend**. Vorteil: kein Kampf gegen etablierte Player. Nachteil: Kategorie muss erst erklärt werden.

### 1.3 AI-Builder-Explosion = unser Rückenwind

| Tool | Launch | User (geschätzt) | A/B-Testing? |
|---|---|---|---|
| **v0** (Vercel) | 2023 | 1M+ | ❌ Kein natives A/B |
| **Bolt.new** (StackBlitz) | 2024 | 500k+ | ❌ |
| **Lovable** (GPT Engineer) | 2024 | 300k+ | ❌ |
| **Replit Agent** | 2024 | 200k+ | ❌ |
| **create.xyz** | 2025 | wachsend | ❌ |
| **Cursor Composer** | 2024 | 1M+ | ❌ |

**Der Shift:** Designer + Indie-Hacker bauen Sites in Minuten mit KI. Aber: **„Ship and pray."** Keiner testet. Das ist unser Window — wir sind das erste Tool, das sagt: „Du hast mit v0 gebaut? Jetzt testen wir's."

### 1.4 Google Optimize Sunset = 3 Jahre alte, ungefüllte Lücke

Sept 2023 hat Google Optimize (kostenlos, GA-integriert) eingestellt. Millionen von Websites hatten plötzlich kein A/B-Testing mehr. Google empfahl Veyour, Optimizely, AB Tasty als „Alternativen" — alles Enterprise mit $50k+ Einstiegshürde.

**Das sind 3 Jahre ungefüllte Nachfrage.** WordPress-Nutzer (43% des Webs) haben seit 2023 keine wirklich einfache A/B-Lösung.

---

## 2. ICP Deep-Dive: Wer ist User #1?

### 2.1 Drei Persona-Cluster

#### 🅰️ **Primary: Der AI-Builder-Designer** (höchste Dringlichkeit)
- **Profil:** Designer (25–40), baut Client-Projekte mit v0/Bolt/Lovable
- **Stack:** Next.js, Custom HTML, oder einfaches React
- **Situation:** Baut Landingpages für Kunden, weiß nicht ob Version A oder B konvertiert
- **Pain:** „Ich kann in 10 Minuten eine Site bauen, aber null testen"
- **Budget:** $35/Monat ist irrelevant — er berechnet $3k–$10k pro Projekt
- **Wo:** X/Twitter (Design-Tech-Bubble), r/nextjs, v0 Discord
- **Trigger:** Hat gerade eine Site mit AI gelauncht und fragt sich „Was jetzt?"

#### 🅱️ **Secondary: Der WordPress-Freelancer** (höchstes Volumen)
- **Profil:** Webdesigner/Entwickler (30–50), baut WordPress-Sites für KMUs
- **Stack:** WordPress mit Divi/Elementor/Gutenberg
- **Situation:** Kein natives A/B in WordPress (es gibt Plugins, aber Schrott)
- **Pain:** „Kunde fragt nach A/B-Test, ich sag: 'zu teuer'"
- **Budget:** Preis-sensibler, aber $35/Monat als Upsell an Kunden (~$500–$2k/Site)
- **Wo:** r/WordPress, WP-Facebook-Gruppen, lokale Meetups
- **Trigger:** Kunde hat Conversion-Probleme, er hat keine Lösung

#### 🅲️ **Tertiary: Der Shopify-Store-Owner-Designer** (höchstes Revenue-Potential)
- **Profil:** E-Commerce-Designer (30–45), baut/managed Shopify-Stores
- **Stack:** Shopify (Custom HTML-fähig)
- **Situation:** Shopify hat natives A/B nur in Shopify Plus ($2k/Monat)
- **Pain:** „Theme-Änderungen sind Blindflug"
- **Budget:** $99/Monat Agency-Tier wäre sofort interessant
- **Wo:** r/shopify, Shopify Community, X E-Com-Bubble
- **Trigger:** Q4-Vorbereitung (September–Oktober — BFCM-Testing)

### 2.2 Wer wird mit höchster Wahrscheinlichkeit User #1?

**AI-Builder-Designer auf X.** Warum:
1. Höchste Dringlichkeit (gerade gelauncht, will optimieren)
2. Technisch affin genug für `<head>`-Edit
3. Entscheidet allein, kein Procurement
4. Kennt das Problem seit Wochen, sucht nicht mehr aktiv — muss gefunden werden
5. $35/Monat ist kein Budget-Gespräch

---

## 3. Wettbewerber-Schwäche-Analyse

### 3.1 Warum Designer existierende Tools nicht nutzen

| Tool | Designer-Fail |
|---|---|
| **Optimizely** | Visual Editor funktioniert nur mit Client-seitigem JS-Tagging — braucht Dev. Pricing intransparent („Call Sales"). UX für PMs, nicht Designer. |
| **VWO** | Komplexer WYSIWYG-Editor. Lädt Designer-Seite in iframe → funktioniert nie richtig. Fokus auf Marketing-Teams, nicht Designer. |
| **Google Optimize (☠️)** | War gratis, aber UX-Katastrophe. Designer mussten im Browser Varianten bauen → kein Figma-Workflow. |
| **GrowthBook** | Open-Source, Feature-Flagging-first. Für Engineers. Designer verstehen „Feature Flag" nicht. |
| **PostHog** | Analytics-first, A/B ist Side-Feature. Setup braucht Dev, kein visueller Editor. |
| **AB Tasty** | EU-Alternative zu Optimizely. Gleiche Probleme: Enterprise-Pricing, Dev-Abhängigkeit, kein Figma. |

### 3.2 Unfair Advantage von variante

| Kriterium | Enterprise-Tools | variante |
|---|---|---|
| **Erstellung** | Browser-WYSIWYG oder Code-Editor | Figma (wo Designer eh arbeiten) |
| **Setup** | Dev muss `<script>` + Tag-Manager einrichten | 1 `<script>`-Tag, 1 Klick im Plugin |
| **KI-Varianten** | Nein | Ja — Prompt-basierte Generierung (~0,3 ct) |
| **Preis** | $50k+/Jahr | $0–$420/Jahr |
| **Zielgruppe** | PMs, Marketer, Engineers | Designer |
| **Distribution** | Cold Calls, Konferenzen, G2-Reviews | Figma Community (organische Discovery) |
| **Badge** | Nein | Ja — viraler Loop, CAC ~0 |

---

## 4. Channel-Analyse: Wo ist User #1?

### 4.1 X/Twitter — der Primärkanal (CAC: Zeit, nicht Geld)

**Warum X zuerst:**
- Designer-Tech-Bubble ist hyperaktiv (v0, Bolt, Lovable, Cursor)
- Pain-Posts sind öffentlich, suchbar, antwortbar
- Kein Gatekeeping (keine Mod-Approval, keine Gruppenregeln)
- Schnellster Feedback-Loop: Reply → DM → Call innerhalb 48h
- Algorithmus belohnt konsistente Nischen-Antworten

**Die Pain-Suchen (5 laufende, gespeicherte Queries):**

| # | Such-Query | Signal |
|---|---|---|
| 1 | `"how do you" test OR "ab test" design OR landing OR website` | Aktive Suche |
| 2 | `(v0 OR bolt OR lovable OR replit) (test OR testing OR "no way" OR "can't")` | AI-Builder-Pain |
| 3 | `"deploy and pray" OR "ship and pray" OR "shipped without"` | Erkannter Pain |
| 4 | `"how to" (test OR "ab test") (figma OR "ai generated" OR "built with")` | Tool-Kombination |
| 5 | `(wordpress OR shopify OR "custom html") (testing OR "ab test" OR optimize)` | Plattform-Pain |

**14-Tage-X-Strategie (existiert bereits, ausbauen):**
- Tag 1–5: 5 Replies/Tag, kein Produkt erwähnen. Nur hilfreiche Fragen stellen.
- Tag 6–10: 2–3 eigene Threads (Pain-Story: „Ich hab 3 AI-Sites gebaut, keine getestet"), weiter antworten.
- Tag 11–14: Erste Brücke: „Ich hab dafür tatsächlich was gebaut", DM an 10 Pain-Poster.

### 4.2 Figma Community — der passive Motor (CAC: ~0)

**Status:** Plugin ist LIVE mit 0 Install (kommt erst durch Outreach + SEO).

**Figma Community SEO-Faktoren:**
- Plugin-Name: „variante" (nicht keyword-optimiert) → könnte besser: „variante — A/B Test & Optimize"
- Description-Tag: Müsste Keywords enthalten („ab test", „split test", „conversion", „design test")
- Reviews: 0 → Erste 5 Reviews sind kritisch für Ranking
- Kategorie: „Design tools" > „Testing" (gibt es nicht als Kategorie, wir sind falsch kategorisiert)

**Quick-Wins für Figma-Discovery (0 Aufwand, großer Hebel):**
1. Plugin-Description mit Keywords anreichern
2. Erste 3 Reviews von Design-Partnern einholen
3. Screenshots + Demo-GIF aktualisieren (zeigen, nicht erklären)

### 4.3 Reddit — der Vertrauenskanal (CAC: Zeit, 2-Wochen-Vorlauf)

| Subreddit | Größe | Relevanz | Strategie |
|---|---|---|---|
| **r/web_design** | 1.2M | 🔥🔥🔥 | 2 Wochen nur kommentieren, dann Signature-Link |
| **r/WordPress** | 250k | 🔥🔥 | Pain-Posts zu „A/B Plugin" sind häufig |
| **r/webdev** | 2.2M | 🔥 | Zu breit, aber gute Threads zu AI-Builders |
| **r/nextjs** | 150k | 🔥 | AI-Builder-Designer sind oft in Next.js |
| **r/shopify** | 200k | 🔥 | Q4-Testing-Fragen im September erwartet |
| **r/figmadesign** | 90k | 🔥🔥 | Designer-Hub, aber Plugin-Answers sind verpönt |
| **r/SaaS** | 150k | 🟡 | Indie-Hacker mit eigenem Produkt |

**Reddit-Regel Nr. 1:** Nie posten, nur kommentieren. Reddit hasst Self-Promo. Der erste Post kommt nach 2 Wochen aktiver, hilfreicher Kommentare — und dann als „Ich hab das Problem selbst erlebt, hier ist was ich gebaut hab".

### 4.4 LinkedIn — der Enterprise-Heiratsantrag (CAC: hoch, aber Agency-Tier)

**Warum LinkedIn später:**
- Agentur-Inhaber (3–15 MA) sitzen dort, aber Kaufzyklus ist länger
- Höhere Hürde: Entscheider brauchen Case-Studies, nicht Demo
- Erst relevant mit 3+ Case-Studies und Referenzen

**Trotzdem jetzt vorbereiten:**
- LinkedIn-Profil auf „Founder, variante — A/B Testing for Designers" optimieren
- 1x/Woche Content-Post zu Branchen-Problemen (nicht Produkt)
- Connect mit 5 Agentur-Inhabern/Woche ohne Pitch

### 4.5 Designer-Communities (Slack/Discord) — opportunistisch

| Community | Typ | Zugang |
|---|---|---|
| **Figma Community Forum** | Offiziell | Offen, aber Plugin-Kanal kaum frequentiert |
| **Designer Hangout** | Slack | Invite-only, ~20k Mitglieder |
| **v0 Discord** | Discord | Offen, aktiv, viele Pain-Posts |
| **Lenny's Discord** | Paid | Hochwertig, aber $150/Jahr Mitgliedschaft |

### 4.6 Content-Marketing — der Compound-Kanal

**Nicht vor User #1 priorisieren**, aber parallel aufbauen:
1. **Blog-Post:** „Google Optimize is dead — what designers should use in 2026" → SEO-Longtail
2. **X-Thread:** „I built 3 AI websites and tested none — here's what I learned" → Emotionale Story
3. **Show HN/Y Combinator:** Launch-Post mit Demo → braucht Case-Study

---

## 5. First-User-Akquisition: Der konkrete Plan

### 5.1 Wo wir stehen (09.07.2026)
- Figma-Plugin LIVE (seit 08.07.)
- 1 Design-Partner angefragt (via X? via Netzwerk?)
- X-Pain-Finder-Script aktiv
- Noch keine Case-Study, noch kein Social Proof

### 5.2 Week 1 (ab jetzt): Outbound-Motion starten

| Tag | Aktion | Kanal | Ziel |
|---|---|---|---|
| **Mo** | 5 Pain-Suchen auf X checken, 5 Replies schreiben | X | Erste Präsenz |
| **Di** | 5 Replies + 1 Follow-up-DM an jemanden mit starkem Pain | X → DM | Erstes Gespräch |
| **Mi** | r/web_design + r/WordPress: 3 hilfreiche Kommentare | Reddit | Karma aufbauen |
| **Do** | Figma-Plugin-Beschreibung optimieren (Keywords) | Figma | SEO für Discovery |
| **Fr** | X: Erster eigener Thread (Pain-Story) + 5 Replies | X | Reichweite |
| **Sa** | Reddit: 3 Kommentare | Reddit | Konsistenz |
| **So** | Recap: Welche Replies hatten Engagement? Welche DMs geöffnet? | — | Lernen |

### 5.3 Week 2: Erste Gespräche führen

- Aus Week-1-Replies: 2–3 DMs vertiefen
- Ziel: 3 Video-Calls (15 min, Pain-Interview, kein Pitch)
- Nach dem Call: „Ich bau genau das, worüber wir gesprochen haben. Darf ich dir's zeigen wenn's fertig ist?"
- **Nicht verkaufen. Zuhören. Problem verstehen.**

### 5.4 Week 3: Design-Partner closen

- Follow-up mit den 3 Call-Kontakten
- Concierge-Onboarding: Gemeinsam ersten Test einrichten
- Screenshot vom ersten Live-Test → das ist Social Proof
- Ziel: 1–2 aktive Design-Partner mit laufendem Test

### 5.5 Week 4: Product Hunt + Launch

- Case-Study aus Design-Partner-Test (anonymisiert oder mit Erlaubnis)
- Product-Hunt-Launch (Dienstag, beste Traffic-Tag)
- Hockey-Netz (X-Follower, Reddit-Kontakte) mobilisieren
- Ziel: Top-5 des Tages, 50+ Upvotes, erste organische Installs

---

## 6. Psychologie des ersten Users

### 6.1 Warum jemand „Ja" sagt (die echten Motive)

| Oberfläche | Tiefe |
|---|---|
| „Ich brauche A/B-Testing" | „Ich will nicht der Designer sein, dessen Site nicht konvertiert" |
| „Optimizely ist zu teuer" | „Mein Chef/Client fragt nach Zahlen, ich hab keine" |
| „Google Optimize ist tot" | „Ich hab 3 Jahre keine Lösung gefunden und aufgegeben" |
| „AI-Sites sind Blindflug" | „Ich fühl mich wie ein Fake — ich baue, aber validiere nicht" |

**Der emotionale Trigger für User #1:** Nicht „A/B-Testing ist cool", sondern **„Endlich kann ich beweisen, dass mein Design funktioniert."**

### 6.2 Das First-User-Paradox

**Problem:** User #1 bekommt das schlechteste Produkt. Kein Social Proof, keine Case-Studies, Bugs, fehlende Features.

**Lösung: Nicht als Produkt verkaufen, sondern als Kollaboration.**
- „Ich such Designer, die mit mir das Produkt besser machen."
- „Du kriegst Pro gratis für 6 Monate, ich krieg ehrliches Feedback."
- Positionierung: Nicht „Kunde", sondern „Design Partner".

Das nimmt Druck vom Produkt und macht aus einem Risiko (unfertiges Tool) einen Vorteil (Exklusivität, Mitgestaltung).

### 6.3 Der „First Test"-Moment (Aha-Erlebnis)

Der Moment, in dem aus einem Interessenten ein Nutzer wird:
1. Designer pickt Element auf seiner Live-Site (Picker im Snippet)
2. Beschreibt Variante B in Figma → KI generiert HTML
3. **Snippet tauscht Varianten live aus** ← Das ist der Aha-Moment
4. Dashboard zeigt erste Visitors → „Es läuft!"

**Alles im Onboarding muss diesen Moment so schnell wie möglich herbeiführen.** Jeder Klick vor dem ersten Live-Test ist ein Drop-off-Risiko.

### 6.4 Warum Designer nicht zahlen (Einwände + Antworten)

| Einwand | Antwort |
|---|---|
| „Ich hab zu wenig Traffic" | „Ab 100 Visitors/Monat statistisch sinnvoll. Deine Landingpage hat das." |
| „A/B-Testing ist kompliziert" | „Deshalb bauen wir's in Figma. Du designst, wir testen." |
| „Ich nutze schon [Tool X]" | „Welches Tool? Die meisten testen Design-Vorschläge, nicht Live-Traffic." |
| „$35/Monat ist teuer" | „1 Stunde Designer-Zeit = $100+. Ein A/B-Test spart dir 10+ Stunden Raten." |
| „Badge stört meine Kunden" | „Pro-Tier: Badge aus, unbegrenzt Tests. $35 = 1 Test, der sich selbst bezahlt." |

---

## 7. Metriken für die First-User-Phase

### 7.1 Leading Indicators (diese Woche)

| Metrik | Ziel | Messung |
|---|---|---|
| X Replies / Tag | 5 | Manuell zählen |
| X-DMs geöffnet | 2/Woche | X-DM-Status |
| Reddit-Kommentare | 3/Tag | Reddit-Profil |
| Figma-Plugin-Installs | 10/Woche (nach Keywords-Optimierung) | Figma Analytics |
| Pain-Interviews geführt | 3/Woche | Kalender |

### 7.2 Lagging Indicators (nächste 30 Tage)

| Metrik | Ziel |
|---|---|
| Design-Partner mit Live-Test | 3 |
| Signups (Free) | 20 |
| Pro-Trial-Starts | 5 |
| Erste Case-Study | 1 |
| Product-Hunt-Upvotes | 50+ |

### 7.3 Der eine kritische Metric

**Time-to-First-Live-Test.** Wie lange von „Install" bis „ab.js liefert erste Impression"? Das ist der einzige Metric, der zählt. Alles andere ist Vanity.

---

## 8. Risiken & Kill-Szenarien

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| **Keiner antwortet auf X** | Mittel | Reply-Qualität > Quantität. Eine tiefe Frage > 5 oberflächliche. Notfalls 2. Grad-Netzwerk (Freunde von Freunden). |
| **Design-Partner droppen ab** | Hoch | Concierge-Onboarding. Nicht sagen „hier ist das Tool", sondern Bildschirm teilen und gemeinsam ersten Test machen. |
| **Figma-Plugin kriegt keine Installs** | Mittel | Keywords optimieren, 3 Reviews von Partnern, Demo-GIF. Notfalls $100 in Figma Ads. |
| **Badge schreckt ab** | Gering–Mittel | Badge ist dezent. Erst wenn sich jemand beschwert relevant. Pro-Tier = Badge aus. |
| **Produkt-Bugs in ersten Tests** | Hoch | Erwartbar. Deshalb Design-Partner, nicht Kunden. Schnell fixen, kommunizieren. |
| **Product Hunt floppt** | Mittel | Floppt ohne Case-Study garantiert. Mit Case-Study und 20+ Vorab-Upvotes gute Chance auf Featured. |

---

## 9. Sofort-Maßnahmen (heute/morgen)

### 9.1 Quick-Wins (0 Code, großer Hebel)

1. **Figma-Plugin-Description SEO** (5 Min): Keywords „A/B test", „split test", „conversion optimization", „design testing" in Description einbauen
2. **X-Profil optimieren** (5 Min): Bio auf „Building variante — A/B testing from Figma. No dev needed." Pinned Tweet: Pain-Story
3. **5 Pain-Suchen auf X speichern** (10 Min): Queries aus §4.1 als Lesezeichen
4. **Reddit-Account prüfen** (2 Min): Karma >100? Sonst werden Kommentare automatisch gelöscht
5. **LinkedIn-Profil aktualisieren** (5 Min): Founder-Titel + Link zu getvariante.com

### 9.2 Diese Woche noch

6. **Erste 10 X-Replies schreiben** (täglich 2, kein Pitch)
7. **2 Pain-Interviews per DM anfragen** („Ich recherchiere zum Thema X, 15 min?")
8. **r/web_design beitreten & 5 Kommentare** (kein Link)
9. **Demo-GIF für Figma-Plugin aufnehmen** (Screen Studio oder Loom)
10. **Blog-Post-Idee skizzieren** (Google Optimize-Alternative, SEO-Targeting)

---

## 10. Quellen & Tools

### Eigene Tools
- `scripts/x-pain-finder.user.js` — Tampermonkey-Script für X-Pain-Highlighting
- `figma-plugin/` — LIVE im Community Store
- `ab.js` — Snippet mit eingebautem Picker
- `ab-tool/` — Dashboard + API

### Externe Tools
- **X Advanced Search** — `x.com/search?q=...` für Pain-Suche
- **Reddit Search** — `reddit.com/r/web_design/search?q=ab+testing`
- **Similarweb** (free) — Traffic-Schätzung für Wettbewerber
- **Figma Community Analytics** — Plugin-Impression/Install-Daten
- **Product Hunt Ship** — Vorab-Launch-Seite für Hype-Aufbau

### Referenz-Frameworks
- **Wasim Owaisi's „How to get your first 10 users"** (X-Thread, viral, 2024–25) — 11-Punkte-Checkliste gegen die variante evaluiert wurde (3/11 grün)
- **Lenny Rachitsky's „How to get your first 100 users"** — Community-First-Ansatz
- **Y Combinator Startup School** — „Do things that don't scale"

---

> **Nächster Schritt:** §9.1 Quick-Wins heute umsetzen. Dann §5.2 Week-1-Plan starten. PROJEKT.md §8 fortschreiben.
