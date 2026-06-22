-- AB-Testing Schema V2 — Designer-native A/B-Testing
-- Eine einzige Tabelle `tests` mit Aggregat-Countern (kein PII, keine Events-Tabelle).
-- Idempotent — kann mehrfach ausgeführt werden ohne Fehler.
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Für die Migration von der alten Struktur (experiments/variants/events)
-- siehe supabase/migrate.sql.

create table if not exists tests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  site_url       text,
  selector       text,                                   -- CSS-Selektor des Zielelements (von Extension)
  goal           text,                                   -- "click:#cta-button"
  snippet_key    text unique not null default gen_random_uuid()::text,
  status         text default 'draft',                   -- draft | active | paused | done
  traffic_split  int default 50,                         -- % der Besucher zu Variante B
  -- Captured von Chrome Extension
  original_html  text,
  site_css       text,
  framework      text,                                   -- tailwind | bootstrap | custom
  -- KI-Generierung
  variant_b_html text,
  -- Aggregat-Counter
  visitors_a     int default 0,
  visitors_b     int default 0,
  conversions_a  int default 0,
  conversions_b  int default 0,
  -- Signifikanz (serverseitig nach jedem Event berechnet)
  significance   float default 0,                        -- 0.0–1.0
  winner         text,                                   -- null | 'A' | 'B'
  created_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Atomare Counter via RPC
-- supabase-js kann kein `col = col + 1` ausdrücken, daher serverseitige
-- Funktionen. Das vermeidet Lost-Updates bei gleichzeitigen Besuchern.
-- ---------------------------------------------------------------------------

-- Weist eine Variante zu (A/B nach traffic_split), inkrementiert den
-- passenden Visitor-Counter und aktiviert den Test beim ersten Besuch.
-- Lookup per snippet_key (öffentlicher Identifier aus dem Snippet).
create or replace function ab_assign(p_key text)
returns text
language plpgsql
as $$
declare
  v_split   int;
  v_variant text;
begin
  select traffic_split into v_split from tests where snippet_key = p_key;
  if v_split is null then
    return null;                                -- Test existiert nicht
  end if;

  v_variant := case when random() * 100 < v_split then 'B' else 'A' end;

  update tests
     set visitors_a = visitors_a + (case when v_variant = 'A' then 1 else 0 end),
         visitors_b = visitors_b + (case when v_variant = 'B' then 1 else 0 end),
         status     = case when status = 'draft' then 'active' else status end
   where snippet_key = p_key;

  return v_variant;
end;
$$;

-- Inkrementiert den Conversion-Counter der angegebenen Variante und gibt
-- die aktualisierte Zeile zurück (die Route berechnet daraus die Signifikanz).
create or replace function ab_convert(p_key text, p_variant text)
returns tests
language plpgsql
as $$
declare
  v_row tests;
begin
  update tests
     set conversions_a = conversions_a + (case when p_variant = 'A' then 1 else 0 end),
         conversions_b = conversions_b + (case when p_variant = 'B' then 1 else 0 end)
   where snippet_key = p_key
   returning * into v_row;

  return v_row;                                 -- alle Felder null, wenn nicht gefunden
end;
$$;
