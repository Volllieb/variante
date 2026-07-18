# Fragebogen: Web Test-Erstellungs-Flow

> Stand: 18.07.2026 · Status: **Anforderungsklärung**
> 
> Ziel: Den neuen Test-Erstellungs-Wizard im Web-Dashboard so durchdenken, dass keine UX-Fragen offen bleiben. Keine technischen Fragen — nur Nutzererlebnis, Abläufe, Entscheidungen.

---

## §A — Gesamtbild & Einstieg

### A1 — Wer erstellt einen Test, und wo fängt er an?

Momentan gibt es zwei Einstiegspunkte: Figma-Plugin (6-Screen-Wizard) und Web-Dashboard (TestCreationPanel mit Scan → Variant → Goal → Create). Zukünftig soll das Figma-Plugin nur noch "Helfer" sein und per "New Test"-Button ins Dashboard weiterleiten.

- [ ] Der User ist im Figma-Plugin, klickt "New Test" → wird ins Web-Dashboard weitergeleitet. Was sieht er dort? Den leeren Wizard bei Step 0? Oder eine Landing-Page mit Kontext ("Du kommst aus Figma — hier geht's weiter")?
- [ ] Ein User, der NUR im Web unterwegs ist (kein Figma): Wo findet er den "New Test"-Button? Im Dashboard in der Sidebar? Oben rechts als CTA? Beides?
- [ ] Soll der Wizard ein Overlay/Modal sein (wie heute `TestCreationPanel`) oder eine eigene Seite (`/dashboard/tests/new`)?

### A2 — Was passiert mit dem Figma-Plugin-Kontext?

Wenn der User aus Figma kommt, hat er dort evtl. schon ein Element ausgewählt oder einen Layer für Variant B markiert.

- [ ] Soll das Figma-Plugin diesen Kontext an den Web-Wizard übergeben (z. B. per URL-Parameter: `?source=figma&element=hero-button`)?
- [ ] Oder startet der Web-Wizard immer blank — der User muss alles neu machen, auch wenn er aus Figma kommt?
- [ ] Soll das Figma-Plugin IRGENDEINE Test-Erstellungs-Funktion behalten? (z. B. "Element markieren und an Dashboard schicken" als eine Art Bookmark/Clipboard?)

### A3 — Abbruch & Wiederaufnahme

- [ ] Was passiert, wenn der User den Wizard mittendrin abbricht (Tab schließen, Zurück-Button)? Ist der Fortschritt verloren?
- [ ] Soll der Wizard den Zustand speichern (localStorage / Server-Draft), sodass der User beim nächsten Öffnen weitermachen kann? (Das Figma-Plugin macht das heute mit `ab_draft`.)
- [ ] Wenn ja: Wie lange lebt ein Draft? Bis zum nächsten Login? Für immer?

---

## §B — Der "Manual vs. AI"-Rhythmus

Jeder Schritt soll zwei Modi haben: User macht's selbst, ODER AI schlägt vor und User bestätigt/korrigiert. Das ist das zentrale UX-Pattern.

### B1 — Wann entscheidet der User?

- [ ] Entscheidet der User PRO SCHRITT ("Step 1: selbst machen oder AI?" → "Step 2: selbst machen oder AI?")?
- [ ] Oder gibt es einen globalen Modus-Schalter am Anfang ("Ich will alles selbst machen" vs. "AI, mach mal") — mit der Möglichkeit, einzelne Schritte zu überschreiben?
- [ ] Oder zeigt der Wizard BEIDES parallel: AI-Vorschlag prominent, mit einem "Stattdessen selbst machen"-Link darunter?

### B2 — Was sieht der User vom AI-Vorschlag?

- [ ] Bekommt der User den AI-Vorschlag sofort angezeigt ("Das hier ist Button X, soll ich den nehmen?") oder muss er aktiv auf "AI vorschlagen" klicken?
- [ ] Wie detailliert ist die AI-Erklärung? Reicht "Button 'Get Started' auf der Hero-Section" oder will der User wissen WARUM die AI genau diesen Button gewählt hat ("höchster Kontrast, above the fold, primärer CTA")?
- [ ] Kann der User den AI-Vorschlag ablehnen und einen neuen generieren lassen ("Anderer Vorschlag")?

### B3 — Korrektur-Flow nach AI-Vorschlag

- [ ] Wenn die AI ein Element vorschlägt, der User aber ein ANDERES will: Wie wählt er es aus? Per Element-Picker (ab.js) auf der Live-Site? Per URL + CSS-Selector manuell?
- [ ] Wenn die AI eine Variant B generiert, der User sie aber anpassen will: Bekommt er einen Text-Input ("Mach den Button blau statt grün") oder einen visuellen Editor?
- [ ] Wenn die AI eine Metrik vorschlägt, der User aber eine andere will: Dropdown mit Alternativen? Oder wieder Element-Picker?

---

## §C — Step 0/1: Element auf der Live-Site wählen

### C1 — Wie wählt der User das zu testende Element aus?

Annahme: Der existierende Element-Picker in `ab.js` (Snippet) kann auch für die Test-Erstellung verwendet werden.

- [ ] Bekommt der User eine URL-Eingabe wie heute ("Gib deine Website-URL ein") und der Wizard lädt die Seite in einem iframe/Preview mit aktiviertem Picker?
- [ ] Oder muss der User das Snippet bereits installiert haben, und der Picker läuft auf seiner LIVE-Seite (die er in einem anderen Tab offen hat)?
- [ ] Was, wenn der User das Snippet NOCH NICHT installiert hat — wie pickt er dann ein Element? (Screenshot-Analyse wie beim Hybrid-Onboarding?)

### C2 — AI-gestützte Element-Vorauswahl

- [ ] Analysiert die AI automatisch die Seite und schlägt EIN Element vor, oder mehrere zur Auswahl ("Das sind deine 3 wichtigsten CTAs — welchen willst du testen?")?
- [ ] Soll die AI Elemente vorschlagen, die NICHT auf der Seite sind? ("Du hast keine CTA-Buttons. Soll ich einen vorschlagen?")
- [ ] Button-Vorauswahl: Du sagst "Beim Testen eines Buttons wird dieser vorausgewählt, kann aber geändert werden." Heißt das: Die AI erkennt automatisch, dass der User einen Button testen will, und wählt den prominentesten aus? Oder: Der User sagt vorher "Ich will einen Button testen" und die AI sucht dann?

### C3 — Mehrere Elemente gleichzeitig?

- [ ] Kann der User MEHRERE Elemente für einen Test auswählen? (z. B. "Teste alle CTA-Buttons auf der Seite gleichzeitig")
- [ ] Oder immer nur 1 Element pro Test?

---

## §D — Step 1/2: Variant B erstellen

### D1 — Figma vs. Auto-Generate

Der User hat zwei Wege zu Variant B:
- **Figma-Weg:** Er gestaltet Variant B in Figma und wählt den Layer aus
- **AI-Weg:** Die AI generiert automatisch eine Variante nach CRO-Best-Practices

- [ ] Werden beide Optionen nebeneinander angeboten ("Gestalte in Figma" ODER "KI generieren lassen")?
- [ ] Oder ist der Figma-Weg der Default für User, die AUS Figma kommen, und der AI-Weg der Default für reine Web-User?
- [ ] Wenn der User "AI generieren" wählt: Bekommt er mehrere Varianten zur Auswahl (z. B. "Variante A: Grün, Variante B: Blau, Variante C: Größer")? Oder genau eine, die er dann verfeinern kann?

### D2 — AI-Variant-Generierung

- [ ] Was genau generiert die AI? Nur CSS (Farben, Größen, Abstände)? Oder auch HTML (neuer Text, neue Struktur)?
- [ ] Soll die AI Varianten basierend auf CRO-Best-Practices generieren (z. B. "Button größer, kontrastreicher, mit Dringlichkeits-Text")? Oder basierend auf dem, was auf DER KONKRETEN Seite Sinn ergibt?
- [ ] Bekommt der User eine visuelle Vorschau der AI-generierten Variante (Screenshot mit CSS-Injection, wie beim Hybrid-Onboarding)?
- [ ] Kann der User die AI-Variante mit natürlicher Sprache verfeinern ("Mach den Button noch größer", "Nimm Blau statt Grün")? → Ähnlich dem existierenden Refine-Overlay.

### D3 — Figma-Integration im Web

- [ ] Wenn der User Variant B in Figma gestalten will: Wie "schickt" er das Figma-Design an den Web-Wizard? Per Copy-Paste eines Links? Per Figma-Plugin das Element exportieren und die Daten per WebSocket/Realtime an das Dashboard senden?
- [ ] Braucht das Figma-Plugin dafür einen "Send to Dashboard"-Button?
- [ ] Was, wenn der User kein Figma hat? Ist der AI-Weg dann die EINZIGE Option? Oder kann er auch manuell CSS/HTML eingeben?

---

## §E — Step 2/3: Conversion-Metrik wählen

### E1 — Was ist eine "Metrik" aus Usersicht?

Heute gibt es im Wizard: Goal-Typ (`click`, `form_submit`, `page_view`, `purchase`, `custom`) + CSS-Selector.

- [ ] Versteht der User "Metrik" als "Was soll gemessen werden?" — z. B. "Klicks auf diesen Button", "Formular-Absendungen", "Käufe"?
- [ ] Soll die Metrik-Auswahl visuell sein ("Klick auf DIESES Element auf deiner Seite") oder abstrakt ("click-Conversion auf CSS-Selector `.cta-button`")?
- [ ] Soll der User eine Conversion ALS EVENT auf der Seite sehen können? ("Hier klicken User — das ist eine Conversion")

### E2 — AI-gestützte Metrik-Vorauswahl

- [ ] Wenn der User in Step 0 einen Button gewählt hat: Schlägt die AI automatisch "Klicks auf diesen Button" als Metrik vor? (Das meinst du mit "Button = vorausgewählt"?)
- [ ] Was schlägt die AI vor, wenn der User KEIN Button-Element hat? Die häufigste User-Aktion auf der Seite?
- [ ] Kann die AI mehrere Metriken vorschlagen? ("Primäre Metrik: Button-Klicks. Sekundäre Metrik: Scroll-Tiefe.")

### E3 — Custom Metriken

- [ ] Braucht der User die Möglichkeit, eine KOMPLETT eigene Metrik zu definieren (z. B. "Wenn ein Element mit Klasse `.success-message` sichtbar wird")?
- [ ] Oder reichen die vordefinierten Typen (`click`, `form_submit`, `page_view`, `purchase`)?

---

## §F — Test-Name & Abschluss

### F1 — Auto-Generierung des Namens

- [ ] Was soll der Auto-Name enthalten? z. B.: `"Button 'Get Started' — Farbe Blau → Grün"` oder `"Hero-CTA-Farbtest #3"`?
- [ ] Soll der User den Namen vor dem Erstellen sehen und editieren können?
- [ ] Soll der Auto-Name die Test-Domain enthalten? (`"getvariante.com: Hero-CTA-Farbtest"`)
- [ ] Was, wenn der User den Test OHNE einen bestimmten Namen erstellt — einfach durchnummerieren? (`"Test #4"`)

### F2 — Der "Done"-Moment

- [ ] Was passiert nach dem Klick auf "Create Test"? Direkt zurück zur Dashboard-Übersicht mit dem neuen Test ganz oben?
- [ ] Oder eine Success-Page mit nächsten Schritten ("Snippet installieren", "Test starten")?
- [ ] Soll der Test automatisch gestartet werden oder "Created (paused)" sein, bis der User ihn manuell aktiviert?

---

## §G — Figma-Plugin als "Helfer"

### G1 — Neue Rolle des Plugins

- [ ] Das Plugin verliert die komplette Test-Erstellung. Was macht es STATTDESSEN?
  - Element-Picker für die Live-Site? (Aber das kann auch `ab.js`.)
  - "In Figma gestalten und ans Dashboard senden"?
  - Schnell-Übersicht über laufende Tests (Name, Status, Visitors)?
  - NUR ein "Open Dashboard"-Button?
- [ ] Soll das Plugin als Akquise-Kanal erhalten bleiben? D.h. neue User entdecken es im Figma-Community-Store und werden ins Web geleitet?
- [ ] Wenn ja: Was sieht ein NEuer User im Plugin, der noch keinen Account hat? Eine Landing-Page mit "Get Started → Web"?

### G2 — Kommunikation Plugin ↔ Dashboard

- [ ] Wie "merkt" das Web-Dashboard, dass der User ein Element in Figma designen will? Polling? WebSocket? Figma-Plugin sendet per API?
- [ ] Soll das heute existierende `figmaListening`-Pattern (Dashboard wartet auf neuen Test aus Figma) erhalten bleiben — aber stattdessen auf "Figma-Design empfangen" warten?

---

## §H — Priorisierung & MVP-Scope

### H1 — Was ist der minimale erste Release?

- [ ] MUSS der "Manual vs. AI"-Toggle in JEDEM Schritt da sein? Oder reicht für v1: Alles AI, mit "Edit"-Button zum Überschreiben?
- [ ] MUSS das Figma-Plugin zum "Helfer" umgebaut werden, bevor der Web-Wizard live geht? Oder kann das Plugin erstmal bleiben wie es ist und der Web-Wizard wird parallel gebaut?
- [ ] MUSS der Element-Picker auf der Live-Site funktionieren (Snippet-Abhängigkeit), oder reicht für v1 die URL+AI-Analyse wie beim Hybrid-Onboarding?

### H2 — Was macht den größten Unterschied für den User?

- [ ] Rangfolge: Was ist WICHTIGER — AI-Vorschläge bei der Element-Wahl, AI-generierte Variants, oder AI-gewählte Metriken?
- [ ] Gibt es einen Schritt, der OHNE AI-Unterstützung nicht sinnvoll ist? (z. B. "Ohne AI-Vorschlag weiß ich nicht, welches Element ich testen soll")

---

## §I — Offene Fragen & Wünsche

- [ ] Gibt es konkrete Beispiele oder Inspirationen, wie andere Tools das gelöst haben, die du gut findest? (Vercel, Linear, etc.)
- [ ] Was ist der häufigste Frust-Moment BEIM Erstellen eines Tests heute?
- [ ] Was würde einen User dazu bringen, den Wizard abzubrechen und nie wiederzukommen?
- [ ] Gibt's noch was, was hier nicht gefragt wurde?
