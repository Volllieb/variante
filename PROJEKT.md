# PROJEKT.md — variantt (Designer-native A/B-Testing)

## Status (24.06.2026)
**Produktname:** **variantt** (Domain noch offen → sichern).
**Phase:** Post-MVP → Go-to-Market. Markt validiert (Phase 0 bestanden 19.06.), kompletter Loop gebaut.
**Jetzt:** Produkt verkaufsreif machen über drei Launch-Flächen — **Figma-Plugin · Chrome-Extension · Landing-Page**.
**Pricing entschieden:** Login-Wall + Paid ab Tag 1 (Supabase Auth, JWT-Gate, Stripe). 3 Tiers (s. u.).
**Leitziel:** 500–1.000 €/Mo passives Asset. Hebel = **Distribution** (Figma Community PLG), nicht Produkt.
**GTM-Fahrplan:** siehe `GOTOMARKET.md`.

## Produkt
Designer wählt ein Element auf seiner Live-Site (Chrome-Extension) → beschreibt Variante B in Figma → KI generiert neues HTML passend zur Site-CSS → Snippet ersetzt das Element bei jedem 2. Besucher → Ergebnisse mit Signifikanz im Plugin. **Kein Dev nötig.**

**Spitze ICP:** Designer & kleine Agenturen, die ihr **eigenes Design per KI in eine Website übertragen** — auf Plattformen **ohne** natives A/B-Testing. Bewusst **nicht** gegen Webflow/Framer/Wix antreten, die A/B schon eingebaut haben (und `<head>` ohnehin sperren). Primär Selbständige + Agenturen.

## Stack & Architektur
Next.js 16 (Vercel, `ab-tool-pied.vercel.app`) + Supabase (Postgres) + Chrome-Extension (MV3) + Figma-Plugin + **DeepSeek API** (HTML-Gen, sehr günstig — ~0,3 ct/Call) + `ab.js`-Snippet.
KI-Generierung läuft über **DeepSeek** (nicht Claude/Opus). MVP-Bau abgeschlossen; alte Bau-Docs (`FAHRPLAN-V2.md`) gelöscht, Architektur-Detaildocs aktuell nicht im Ordner.

## Pricing & Unit Economics
| Tier | Preis | Inhalt | Zweck |
|---|---|---|---|
| **Free** | 0 | 1 aktives Experiment, Plugin + Tracking, kurze Datenhaltung, „powered by variantt"-Badge **an** | Figma-Discovery + viraler Loop, **kein Umsatz** |
| **Pro** | ~$35/mo (pro Designer) | unbegrenzte Experimente, AI-Variant-Gen, volle Statistik, Badge **aus** | Solo-Monetarisierung |
| **Agency/Team** | ~$99–149/mo | mehrere Sites/Kunden, **White-Label**-Results-Dashboard, Team-Seats | **Hier sitzt das Geld** — White-Label = Wiederverkauf |

**KI-Kosten:** DeepSeek ~**0,3 ct/Call**, ~3 Calls < 1 ct pro Generierung → Marge praktisch 100 %. Selbst Free-AI-Gen ist quasi kostenlos.
**Offene Produktentscheidung:** AI-Variant-Gen auch im Free-Tier (1 Experiment)? Empfehlung **ja** — sonst kein Aha-Moment für Free-User; Kosten vernachlässigbar. Monetarisierung über *unbegrenzt + Badge-aus*, nicht über das KI-Feature selbst.

## Plattform-Support (Snippet im `<head>`)
| Plattform | Support | Hürde |
|---|---|---|
| Custom HTML | ✅ | `<script>` in `<head>` |
| WordPress | ✅ | via Code-Snippet-Plugin oder Theme |
| Next.js/React | ✅ | `layout.tsx` / `_document.tsx` |
| Shopify | ✅ | `theme.liquid` |
| Webflow | ⚠️ | nur Paid hat `<head>`-Zugriff |
| Framer | ❌ | kein einfacher `<head>`-Zugriff |
| Wix / Squarespace | ❌ | kein Custom-Script im `<head>` |

Anti-Flicker (`html.__ab_pending`) + async braucht zwingend `<head>` — `<body>` würde flackern. Webflow/Framer/Wix haben zudem **eigenes A/B-Testing** → nicht unser Markt.

## Recht
**Einzelunternehmen (Bayern/DE)** — reicht für Stripe + Impressum. ⚠️ Bei USD-Preisen + intl. Kunden: Kleinunternehmer §19, Reverse-Charge/OSS, USt — vor Live-Schaltung kurz mit Steuerberater klären (Stripe Tax kann das meiste). Keine Steuerberatung von mir.

---

## Umsetzung v3 — Launch-Vorbereitung

**Lücke:** MVP hat **keine Auth** — offen für alle. v3 schließt das + bringt Pricing + Launch-Flächen.

### v4-Features, die v3 vorzieht (nur Pflicht)
- **#15 Login-System** — = die Pricing-Methode.
- **#10 Datensicherheit** — Multi-Tenancy + RLS, kein Zugriff auf fremde Kundendaten.
- **#11 DSGVO-Hinweis** — Kunde muss über Datenverarbeitung des Snippets informiert sein (DE-Pflicht).
- **#12 Onboarding** — minimal, 1 Erklär-Screen.

### A. Auth & Multi-Tenancy (Rückgrat)
Supabase Auth (E-Mail/Passwort + Magic-Link). Schema-Delta:
```sql
alter table tests add column user_id uuid references auth.users(id);
alter table tests enable row level security;
create policy "owner_rw" on tests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table profiles (
  id uuid primary key references auth.users(id),
  stripe_customer_id text,
  subscription_status text default 'trialing',  -- trialing|active|past_due|canceled
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now()
);
```
- **Management-Routen** (`POST /api/tests`, `/api/capture`, `/api/generate`, `GET /api/tests/[id]`) → JWT + aktive/Trial-Sub.
- **Snippet-Routen** (`/api/assign`, `/api/variant`, `/api/event`) bleiben **public + CORS `*`** (laufen bei fremden Besuchern, scoped via `snippet_key`).
- **Plugin↔Extension:** Plugin (authed) legt Test an → `testId`. Extension hat eigenen Login (gleiches Konto) → `POST /api/capture` mit JWT, Server prüft Test-Owner. (löst #10)

### B. Billing (Stripe)
Checkout auf Landing-Page, ein Monats-Abo zum Start. 14-Tage-Trial → Paywall. Webhook setzt `subscription_status`. API-Gate: nur `trialing`/`active` darf Tests laufen lassen.

### C. Datenschutz & Security (#10/#11)
RLS trennt Mandanten hart, Service-Role-Key server-only. `ab.js` nutzt `localStorage` (kein Cookie) → trotzdem Personenbezug. Liefern: Datenschutz-Textbaustein für Kunden, AVV-Vorlage, Onboarding-Hinweis.

### D. Onboarding (#12)
1 Welcome-Screen beim ersten Öffnen (6-Schritt-Flow), State in `figma.clientStorage`.

### Launch-Flächen
- **Figma-Plugin:** Login- + Onboarding-Screen; Listing-Assets (Icon, Cover, Beschreibung EN, 3–5 Screenshots/GIF); `networkAccess`-Domains + Figma-Review-Guidelines.
- **Chrome-Extension:** Login + `testId`-Eingabe im Popup; MV3, Icons, **Privacy-Policy-URL** (Pflicht), Permissions-Begründung, Store-Listing. Raus aus ZIP-Verteilung → offizieller Web Store.
- **Landing-Page (neu):** Hero, Demo-GIF, 6-Schritt-Erklärung, Pricing + Stripe-Checkout, Sign-up/Login, Install-Links. **DE-Pflicht: Impressum + Datenschutzerklärung.**

### Fahrplan (Anschluss an MVP-E2E ~18.07.)
| Block | Inhalt | Dauer |
|---|---|---|
| v3-A | Auth + `user_id` + RLS + JWT-Gate | ~5 T |
| v3-B | Stripe Checkout + Webhook + Gate | ~3 T |
| v3-C | DSGVO-Bausteine + Security-Review | ~2 T |
| v3-D | Landing-Page (inkl. Impressum/Datenschutz) | ~3 T |
| v3-E | Plugin/Extension-Login + Store-Submissions | ~3 T + 2–7 T Review |

**Ziel öffentlicher Launch:** Mitte August 2026 (Review-Zeiten = Unsicherheit → früh einreichen).
**Abhängigkeit:** v3-A blockiert B/D/E → zuerst, Rest parallelisierbar.

---

## Offen (Rest)
Domain für „variantt" sichern · Free-Tier AI-Gen ja/nein (Empfehlung: ja) · MVP-Live-Status (deployed & E2E auf echter Fremd-Site getestet?) · `ARCHITEKTUR-ZIEL.md` Claude→DeepSeek aktualisieren · Steuer/USt mit Berater bestätigen.

## v4-Backlog (zurückgestellt)
1. Globales CSS in Figma-Preview ohne Rendering-Fehler. 2. KI-Prompt-Feld + variable Übertragungs-Genauigkeit (nur Geometrie / +Schrift / +Größe / Border-Radius / Farbe / Text). 3. Inline- → globales CSS bei Variante B. 4. Auto-Complete letzter Eingaben. 5. Schnelleres Dashboard-Update. 6. Pause-Button (Snapshot bei viel Traffic). 7. Gesamt-Übersicht (kumulierte Besucher/Verbesserung). 8. Auto-Auswahl Gewinner (vermutlich da, verifizieren). 9. Konfigurierbare Gewinn-Kriterien. 13. Mehrere Metriken parallel. 14. Relative Verbesserung (Lift) prominenter zeigen.

---

## Archiv
- **Validierung:** Prinzipien Mom-Test, Machbarkeits-Spike zuerst, Distribution > Produktlücke. Phase 0 bestanden → Produkt gebaut.
- **Verworfen:** Lead-Gen Architekten (Datenverfügbarkeit ok, aber kein spezifischer Vertriebsvorteil; Handwerk = KI-Slot besetzt). Lerngewinn: Strategie auf Distribution-Hebel gedreht.
