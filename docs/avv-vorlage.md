# Auftragsverarbeitungsvertrag (AVV) — variante

> **Vorlage für Kunden.** variante ist Auftragsverarbeiter für die Besucherdaten,
> die über das `ab.js`-Snippet auf Kundenseiten verarbeitet werden. Ohne AVV nach
> Art. 28 DSGVO darf kein B2B-Kunde in Deutschland das Snippet einsetzen.
>
> **Rechtsberatung ersetzt dieses Dokument nicht.** Vor dem Launch anwaltlich
> prüfen lassen.

## 1. Gegenstand und Dauer der Verarbeitung

**Gegenstand:** Bereitstellung einer A/B-Testing-Plattform („variante") als
Software-as-a-Service. variante verarbeitet im Auftrag des Kunden
Besucherdaten, die über ein JavaScript-Snippet (`ab.js`) auf den vom Kunden
bezeichneten Websites erhoben werden.

**Dauer:** Für die Laufzeit des zwischen den Parteien bestehenden
Nutzungsvertrags (Plan: Free, Pro, Agency).

**Art und Zweck:** Die Verarbeitung dient ausschließlich der Durchführung
statistischer A/B-Tests (Zuordnung zu Testvarianten, Zählung von Conversions)
sowie der Bereitstellung der Testergebnisse im Dashboard des Kunden.

## 2. Art der verarbeiteten Daten

- **Zuweisungsdaten:** Pseudonyme Testgruppen-Zuordnung (Variante A oder B),
  generiert beim Seitenaufruf. Keine Zuordnung zu natürlichen Personen.
- **Conversion-Daten:** Informationen darüber, ob ein Besucher eine vom Kunden
  definierte Conversion (Klick, Seitenaufruf, Formular-Absenden) durchgeführt hat.
- **Technische Daten:** Hostname der Kundenseite (Domain), ohne Pfad.
  **Keine IP-Adressen**, **keine User-Agent-Strings**, **keine Browser-Fingerprints**.
- **Optional, nur mit Consent:** Persistente pseudonyme Besucher-ID
  (`localStorage`, `sessionStorage`, nur nach `window.varianteConsent = true`).

## 3. Kategorien betroffener Personen

Besucher der vom Kunden bezeichneten Websites.

## 4. Technische und organisatorische Maßnahmen (TOM)

- **Transportverschlüsselung:** TLS 1.3 für sämtliche API-Kommunikation.
- **Datenminimierung:** Server-seitig wird nur der Hostname (Domain) der
  besuchenden Website verarbeitet — kein Pfad, keine IP, kein User-Agent.
- **Zugangskontrolle:** Zugriff auf verarbeitete Daten ausschließlich über
  authentifizierte API-Endpunkte (OAuth 2.0 / API-Token).
- **Mandantentrennung:** Strikte Tenant-Isolation auf Datenbankebene (Row-Level
  Security, `auth.uid() = user_id`). Keine Cross-Tenant-Datenzugriffe möglich.
- **Pseudonymisierung:** Besucherdaten werden unter einem pro Test generierten
  `snippet_key` geführt, nicht unter der Besucher-IP oder anderen direkten
  Identifikatoren.
- **Löschkonzept:** Automatisierte Retention-Cronjobs (Waitlist: 12 Monate,
  Events: 12 Monate, Agent-Runs: 6 Monate, Daily Stats: 12 Monate).

## 5. Sub-Prozessoren

| Sub-Prozessor | Sitz | Leistung | Rechtsgrundlage |
|---|---|---|---|
| Vercel Inc. | USA | Hosting (Functions, Edge Network) | EU-US DPF, SCC |
| Supabase Inc. | USA | Datenbank (PostgreSQL) | EU-US DPF, SCC |
| OpenAI L.L.C. | USA | KI-Generierung (Client-seitige HTML-Varianten) | EU-US DPF, SCC, kein Training |
| Resend Inc. | USA | E-Mail-Versand (Winner-Notifications) | EU-US DPF, SCC |
| Upstash Inc. (Redis) | USA | Rate-Limiting (gehashte IPs) | EU-US DPF, SCC |
| URLBox (optional) | DE | Preview-Screenshots | EU (DSGVO) |

**Hinweis:** Google ist **nicht** Sub-Prozessor. Es werden keine
Google-Fonts, -Favicons oder -CDNs verwendet.

## 6. Rechte des Kunden (Verantwortlicher)

- **Auskunft:** Der Kunde kann jederzeit einen DSGVO-Datenexport anfordern
  (`GET /api/profile/export`), der alle beim Auftragsverarbeiter gespeicherten
  Daten im maschinenlesbaren Format (JSON) liefert.
- **Löschung:** Der Kunde kann seinen Account und sämtliche Daten selbstständig
  löschen (`DELETE /api/profile`). Die Löschung umfasst Tests, Events, Domains,
  Storage-Objekte und Stripe-Abonnement.
- **Kontrolle:** Der Kunde kann das Snippet jederzeit von seiner Website
  entfernen; die Verarbeitung endet sofort.

## 7. Pflichten des Auftragsverarbeiters

- **Weisungsgebundenheit:** variante verarbeitet Daten ausschließlich
  entsprechend der Konfiguration des Kunden (Tests, Variants, Goals).
- **Meldepflicht:** variante informiert den Kunden unverzüglich bei
  Datenschutzverletzungen.
- **Unterstützung:** variante unterstützt den Kunden bei der Erfüllung von
  Betroffenenrechten (Auskunft, Löschung, Datenportabilität).

## 8. Abschluss

Dieser AVV gilt mit Annahme der Nutzungsbedingungen von variante als
abgeschlossen. Der Kunde kann diesen AVV jederzeit im Account-Bereich
einsehen und herunterladen.

---

*variante — [Kontakt und Impressum](https://www.getvariante.com/imprint)*
