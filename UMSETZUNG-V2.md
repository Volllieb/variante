# Fahrplan V2 — Umsetzungsstand

Stand: **19.06.2026 (V2.2)**. Alle Code-Phasen (1–6) sind umgesetzt, Build + 
Typecheck sind grün. Phase 7 (Live-E2E) erfordert die manuellen Schritte unten.

> Letzte automatisierte Aktion: API von Claude auf DeepSeek umgestellt.
> ab-tool build erfolgreich.

---

## Aktueller Deploy-Status

| Komponente | Status | URL / Pfad |
|---|---|---|
| **ab-tool (API)** | ✅ Live auf Vercel | https://ab-tool-pied.vercel.app |
| **ab-spike (Client)** | ✅ Live auf Vercel | https://ab-spike.vercel.app |
| **Chrome Extension** | Code bereit (muss reloaded werden) | `chrome-extension/` |
| **Figma Plugin** | ✅ Build erfolgreich (dist/ aktuell) | `figma-plugin/dist/` |

---

## Identifier-Strategie

Es gibt bewusst **zwei** Identifier:

- **`snippet_key`** (öffentlich, im universellen Snippet): genutzt von `ab.js` 
  über `/api/assign`, `/api/variant`, `/api/event`. Wird nie im Client-Snippet 
  direkt geleakt (Auflösung via `/api/resolve`).
- **`id` (UUID)** (intern): genutzt von Extension (`/api/capture`), Plugin-Polling,
  `/api/generate`, `/api/tests/[id]` sowie dem Dashboard.

Der Query-/Body-Param heißt überall `testId`; bei öffentlichen Routen trägt er
den `snippet_key`-Wert, bei Tooling-Routen die UUID.

---

## Was lebt auf dem API-Server (ab-tool)

| Route | Methode | Zweck |
|---|---|---|
| `/api/tests` | GET | Alle Tests fürs Plugin-Dashboard (sortiert, max 50) |
| `/api/tests` | POST | Neuen Test anlegen (name, site_url) |
| `/api/tests/[id]` | GET | Vollständigen Test per UUID abrufen |
| `/api/tests/[id]` | PATCH | selector/goal/status updaten (Re-Select + Metrik) |
| `/api/capture` | POST | Element-Daten von Extension speichern |
| `/api/generate` | POST | KI generiert Variante B (DeepSeek, Vision) |
| `/api/resolve` | GET | Host/Path → passende Tests mit snippet_key |
| `/api/assign` | GET | Variante zuweisen + Visitor-Counter inkrementieren |
| `/api/variant` | GET | Variante B HTML ausliefern |
| `/api/event` | POST | Conversion tracken (sendBeacon) |
| `/api/results/[id]` | GET | Signifikanz-bereinigte Ergebnisse |

---

## Kernfeatures V2.2 (aktuell)

### Re-Select robust
PATCH `selector=null` → neuer Pick funktioniert auch beim selben Element.

### Metrik per Chrome
Eigener Step im Plugin-Flow; optional bei Button, verpflichtend bei Text 
(DOMParser-Check auf `original_html`).

### Figma-Treue
Prompt fordert exakte Nachbildung mit Inline-Styles, keine neuen 
Utility-Klassen (Tailwind-Purging-Fix).

### Soll/Ist-Vergleich
Generate-Screen zeigt Figma-Screenshot neben gerendertem HTML.

### Zurück zu Figma
Overlay nach Chrome-Capture, Plugin pollt automatisch weiter.

---

## Manuelle Schritte (zur Live-Schaltung)

### 1. Supabase-Migration (SQL-Editor)
Im Supabase Dashboard → SQL-Editor → **in dieser Reihenfolge** ausführen:

**a) Tabelle + RPCs:**
```sql
-- ab-tool/supabase/schema.sql
create table if not exists tests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  site_url       text,
  selector       text,
  goal           text,
  snippet_key    text unique not null default gen_random_uuid()::text,
  status         text default 'draft',
  traffic_split  int default 50,
  original_html  text,
  site_css       text,
  framework      text,
  variant_b_html text,
  visitors_a     int default 0,
  visitors_b     int default 0,
  conversions_a  int default 0,
  conversions_b  int default 0,
  significance   float default 0,
  winner         text,
  created_at     timestamptz default now()
);

create or replace function ab_assign(p_key text)
returns text language plpgsql as $$
declare
  v_split   int;
  v_variant text;
begin
  select traffic_split into v_split from tests where snippet_key = p_key;
  if v_split is null then return null; end if;
  v_variant := case when random() * 100 < v_split then 'B' else 'A' end;
  update tests
     set visitors_a = visitors_a + (case when v_variant = 'A' then 1 else 0 end),
         visitors_b = visitors_b + (case when v_variant = 'B' then 1 else 0 end),
         status     = case when status = 'draft' then 'active' else status end
   where snippet_key = p_key;
  return v_variant;
end;
$$;

create or replace function ab_convert(p_key text, p_variant text)
returns tests language plpgsql as $$
declare
  v_row tests;
begin
  update tests
     set conversions_a = conversions_a + (case when p_variant = 'A' then 1 else 0 end),
         conversions_b = conversions_b + (case when p_variant = 'B' then 1 else 0 end)
   where snippet_key = p_key
   returning * into v_row;
  return v_row;
end;
$$;
```

**b) Alte Tabellen droppen:**
```sql
-- ab-tool/supabase/migrate.sql
drop table if exists events cascade;
drop table if exists variants cascade;
drop table if exists experiments cascade;
```

**c) Goal-Kandidaten-Spalte:**
```sql
-- ab-tool/supabase/migrate-v2-1.sql
alter table tests add column if not exists goal_candidates jsonb;
```

### 2. Env-Vars in ab-tool/.env.local setzen
| Variable | Wert / Quelle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nqempmlihcwoifeltiub.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (service_role key) |
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api_keys |

### 3. Build + Deploy ab-tool (nach Env-Vars)
```bash
cd ab-tool
npm run build
vercel --prod
```

### 4. Deploy ab-spike (optional — Client-Site-Testseite)
```bash
cd ab-spike
npm run build
vercel --prod
```

### 5. Chrome Extension reloaden
1. `chrome://extensions` öffnen
2. Entwicklermodus einschalten
3. „Entpackt laden" → `chrome-extension/` auswählen (oder reload)
4. Extension-Popup testen: testId eingeben → Element auf Seite picken

### 6. Figma Plugin laden
1. In Figma Desktop: Plugins → Entwicklung → „Import plugin from manifest…"
2. `figma-plugin/manifest.json` auswählen
3. Plugin startet mit Dashboard

---

## E2E-Checkliste (vollständiger Durchlauf)

- [ ] **Plugin:** Test anlegen (Name + URL) → testId wird im Plugin angezeigt
- [ ] **Browser:** öffnet automatisch mit aktivem Picker → Element anklicken → Plugin zeigt Selektor
- [ ] **Plugin:** In Figma Variante-B-Element wählen → exportieren → Metrik-Screen erscheint
- [ ] **Plugin:** Goal im Dropdown wählen (oder Standard bei Button) → „Generieren"
- [ ] **KI:** Generiert HTML → Soll/Ist-Vorschau sichtbar → Snippet kopieren
- [ ] **Snippet:** In Test-Seite `<head>` einfügen → deployen
- [ ] **Live:** Seite laden → kein Flickering → Variante B sichtbar (wenn zugewiesen)
- [ ] **Counter:** 10× Inkognito → `visitors_a`/`visitors_b` steigen
- [ ] **Conversion:** Goal-Element klicken → `conversions_a`/`conversions_b` steigen
- [ ] **Dashboard:** Plugin-Ergebnisse + `/results/[id]` → gleiche Zahlen
- [ ] **Fehlerfall:** Ungültige testId → stille Fehler, keine roten Konsolenfehler

---

## Was bereits lokal gemacht wurde

| Schritt | Status |
|---|---|
| API von Claude → DeepSeek umgestellt (`route.ts` + `.env.local`) | ✅ |
| Figma Plugin build script auf Windows angepasst (`copy /Y` statt `cp`) | ✅ |
| Figma Plugin `npm run build` → dist/code.js + dist/ui.html aktuell | ✅ |
| ab-tool `npm run build` → TypeScript + Next.js Build grün | ✅ |
| ab-tool `npm install` → Dependencies installiert | ✅ |
| ab-spike `npm install` → Dependencies installiert | ✅ |
| Alle API-Routen in ab-tool vorhanden und kompiliert | ✅ |

---

## Bekannte Annahmen / Tradeoffs

- `/api/generate` nutzt direkten `fetch` auf DeepSeek-API (OpenAI-kompatibel, kein SDK)
  — vermeidet Bundle-Dependency in der Serverless-Route.
  Model: `deepseek-chat`, `max_duration = 60`.
- `traffic_split` (Default 50) steuert die B-Wahrscheinlichkeit in `ab_assign`.
- Signifikanz-Update in `/api/event` ist nicht transaktional mit dem Counter-
  Increment (der Increment selbst ist atomar via RPC) — für MVP ausreichend.
- Chrome Extension benötigt reload nach jedem Code-Update (entpackt).
- Figma Plugin muss nach build neu in Figma geladen werden (`Import plugin from manifest…`).
