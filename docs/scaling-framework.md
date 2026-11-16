# scaling-framework.md — variante

> **Stand: 09.11.2026.** Übergeordnetes Wachstums-Framework für variante. Grundlage: Hormozis „$100M Scaling Roadmap" (Acquisition.com, personalisierter Guide ab Stage 0). Dieses Dokument legt fest, **in welcher Stufe** variante steht und **woran** der Aufstieg gemessen wird. Das operative „Wie" (Kanäle, Pipeline, Pipeline-Log) bleibt in `kursdefinition.md`. Bei Widerspruch gilt dieses Dokument.

## Die 10 Stufen

| # | Stufe | Kern | Für variante |
|---|---|---|---|
| **0** | **Improvise** | Leute probieren dein Ding gratis aus | **← wir sind hier** |
| 1 | Monetize | Erste (wiederholte) Verkäufe | nächstes Ziel |
| 2 | Advertise | Bezahlte/skalierte Akquise | |
| 3 | Stabilize | | |
| 4 | Prioritize | | |
| 5 | Productize | | |
| 6 | Optimize | | |
| 7 | Categorize | | |
| 8 | Specialize | | |
| 9 | Capitalize | | |

Der vorliegende Guide beschreibt nur Stufe 0 und 1 im Detail. Stufen 2–9 werden ergänzt, sobald wir dort ankommen. **Regel: keine Stufe überspringen.** Arbeit, die erst in eine spätere Stufe gehört (Ads, Agency-Tier, Skalierungs-Infrastruktur), wird nicht gemacht.

## Ehrliche Einordnung (09.11.2026): Stage 0

Stage 0 ist bestanden, wenn **externe Leute das kostenlose Produkt tatsächlich nutzen, es hilfreich finden und wiederkommen.** Stand heute:

- Produkt ist live und produktionsreif (Dashboard, `ab.js`, Figma-Plugin im Community Store, Stripe scharf).
- 1 organischer Signup (13.07.), Design-Partner angefragt, aber **kein dokumentierter Live-Test auf einer fremden Site**, Pipeline-Log in `kursdefinition.md` leer.

→ Das Produkt ist weiter als Stage 0 verlangt, die **Nutzung** nicht. Der Engpass ist nicht Technik, sondern dass niemand Fremdes damit arbeitet. Das Ziel „erster zahlender Pro-Kunde" aus `kursdefinition.md` ist das Abschlusskriterium von **Stage 1**, nicht der nächste Schritt.

## Stage 0: Improvise — „Researcher"

**Rolle:** Researcher · **Team:** nur du · **Problem:** Es passiert nichts · **Abschluss:** Leute nutzen das Gratis-Angebot und finden es gut.

| Bereich | Was der Guide sagt | Übersetzt auf variante |
|---|---|---|
| **Produkt** | Etwas haben, das man gratis weitergeben kann | Steht. Free-Plan + **Concierge-Test**: Wir setzen den ersten A/B-Test für den Partner selbst auf. |
| **Marketing** | Im eigenen Umfeld streuen: Bekannte, Kontakte, Follower | Warme Kontakte zuerst (Designer, Gründer aus dem Netzwerk), dann Loom-DMs (Kanal A/B aus `kursdefinition.md`). Kein Launch-Event nötig. |
| **Sales** | Nicht verkaufen, sondern um Ausprobieren bitten und Feedback holen | Angebot: „Ich baue dir gratis einen A/B-Test auf deiner Seite." Nach jedem Test: Was hat geholfen, was fehlt? |
| **Customer Service** | Gratis-Nutzer extrem gut betreuen | Antwort am selben Tag, Setup-Hilfe per Call/Loom, Snippet-Einbau notfalls selbst übernehmen. |
| **Technik** | Nur Basics | Ist mehr als erfüllt → **Feature-Stopp**, außer ein Gratis-Nutzer blockiert ohne den Fix. |
| **Basis-Setup** | Rechtsform, Geschäftskonto, Ausgaben tracken | Kleinunternehmer (§19 UStG) ✅. Offen prüfen: separates Geschäftskonto, Ausgaben-Tracking (OpenAI, Vercel, Supabase, Domain). |

**Leitsätze Stage 0:** Geld ist noch kein Ziel · Helfen und Feedback holen · Alles einfach halten · Bereit sein, nach Feedback umzubauen · Kaum Geld ausgeben · Aus jeder Interaktion lernen.

### Abschlusskriterium Stage 0 → 1 (messbar für variante)

| Kriterium | Schwelle |
|---|---|
| Externe Sites mit Live-Test (nicht eigene, nicht Test-Page) | **≥ 3** |
| Davon mit positivem Feedback („hilft mir", „will ich weiter nutzen") | **≥ 2** |
| Wiederkehrende Nutzung: zweiter Test vom selben Nutzer gestartet | **≥ 1** |

Erfüllt → Stage 1. Quelle der Wahrheit: Pipeline-Log in `kursdefinition.md`.

## Stage 1: Monetize — „Starter"

**Rolle:** Starter · **Team:** 1 · **Problem:** Das Business verdient kein Geld · **Abschluss:** Erster Verkauf, und zwar wiederholt an verschiedene Kunden.

| Bereich | Was der Guide sagt | Übersetzt auf variante |
|---|---|---|
| **Produkt (Hauptengpass)** | V1 muss gut genug sein, dass jemand zahlt; versteckte Reibung finden | Aus Stage-0-Feedback: Was fehlt, damit Pro (35 €/Mo) es wert ist? Reibung im Funnel (Snippet-Einbau, Picker, Wartezeit bis Signifikanz) beheben. |
| **Marketing** | Kommunizieren, dass es jetzt etwas kostet und warum | Pro-Value klar vom Free-Plan abgrenzen; Ergebnisse der Gratis-Nutzer als Beleg. |
| **Sales** | Ergebnisse der Gratis-Kunden als Beweis, über Probleme reden, bei Fans anfangen, Preis offen nennen | Zuerst die Stage-0-Partner auf Pro ansprechen. Case-Study mit Lift-Zahl. |
| **Customer Service** | Zahlende erwarten mehr, beschweren sich eher | Support-Prozess festlegen (Antwortzeit, Kanal). |
| **Technik** | Günstig/gratis, von anderen lernen | Bestehender Stack reicht. |
| **Hilfe holen** | Freelancer für Teilaufgaben, klare Absprachen | Erst bei echtem Engpass. |
| **Geld** | Zahlung einrichten, echte Zahlung durchlaufen lassen, Zahlungseingang tracken | Stripe live ✅. Prüfen: einmal echte Zahlung end-to-end bis aufs Konto. |
| **Absichern** | Vereinbarungen schriftlich | AVV-Vorlage ✅ (`avv-vorlage.md`), AGB/Datenschutz aktuell halten. |

### Abschlusskriterium Stage 1 → 2

Alle müssen erfüllt sein: Verkäufe kommen **regelmäßig** (nicht einmalig) · Kunden zahlen den Listenpreis · einfache Systeme laufen · Zahlungen sind sauber getrackt · wir wissen, was Kunden wollen · bereit für Werbung.

Für variante konkret: **≥ 3 zahlende Pro-Kunden aus unterschiedlichen Quellen**, mindestens einer davon im zweiten Abrechnungsmonat.

## Entscheidungsregel (gilt vor `kursdefinition.md`)

Vor jeder Arbeit: **Bringt das variante dem Abschlusskriterium der aktuellen Stufe näher?** Nein → nicht machen. In Stage 0 heißt das praktisch: Gespräche, Concierge-Setups und Support für Gratis-Nutzer schlagen jedes neue Feature.

## Stufen-Log

| Datum | Stufe | Eintrag |
|---|---|---|
| 09.11.2026 | 0 | Framework eingeführt. Einordnung Stage 0: Produkt live, aber noch keine dokumentierte externe Nutzung. |
