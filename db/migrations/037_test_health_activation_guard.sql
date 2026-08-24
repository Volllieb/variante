-- Migration 037: Health-Trigger deaktiviert keine laufenden Tests mehr
--
-- Plan DB-02: compute_test_health() (020_test_health.sql) setzte bisher bei
-- JEDEM INSERT/UPDATE auf `tests` NEW.status von 'active' auf 'draft' zurück,
-- sobald eines von fünf Pflichtfeldern leer war — nicht nur beim Aktivieren.
-- Ein PATCH auf einen bereits laufenden Test (z.B. variant_b_html kurzzeitig
-- leeren, während eine neue Variante gespeichert wird) hat damit den Test
-- unbemerkt pausiert: kein Fehler, kein Event-Log-Eintrag (die API loggt nur
-- den vom Client gesendeten Status-Wechsel, nicht den tatsächlich vom
-- Trigger überschriebenen), die Response sagte trotzdem { ok: true }.
--
-- Fix: Der automatische Downgrade greift nur noch beim ÜBERGANG in 'active'
-- (Aktivierung), nicht mehr auf einem bereits aktiven Test. health_status/
-- health_issues werden weiterhin bei jedem INSERT/UPDATE berechnet (fürs
-- Issue-Badge im Dashboard) — nur der Status-Override ist jetzt auf den
-- Aktivierungs-Moment begrenzt.
--
-- ab_assign() (001_schema.sql) aktiviert Tests beim ersten Besuch weiterhin
-- automatisch (draft → active) — das ist der einzige verbleibende Pfad, der
-- ohne API-Layer läuft, und wird deshalb zusätzlich gegen health_status
-- abgesichert (siehe unten).

CREATE OR REPLACE FUNCTION compute_test_health()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_issues JSONB := '[]'::jsonb;
  v_activating BOOLEAN;
BEGIN
  -- 1. Name (immer vorhanden, NOT NULL in DB — trotzdem sicherheitshalber)
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    v_issues := v_issues || '["missing_name"]'::jsonb;
  END IF;

  -- 2. site_url — ohne URL kann das Snippet nicht ausgeliefert werden
  IF NEW.site_url IS NULL OR trim(NEW.site_url) = '' THEN
    v_issues := v_issues || '["missing_site_url"]'::jsonb;
  END IF;

  -- 3. selector — ohne Selektor weiß ab.js nicht, welches Element ersetzt wird
  IF NEW.selector IS NULL OR trim(NEW.selector) = '' THEN
    v_issues := v_issues || '["missing_selector"]'::jsonb;
  END IF;

  -- 4. Variant — mindestens HTML oder CSS für Variante B muss vorhanden sein
  IF (NEW.variant_b_html IS NULL OR trim(NEW.variant_b_html) = '')
     AND (NEW.variant_b_css IS NULL OR trim(NEW.variant_b_css) = '') THEN
    v_issues := v_issues || '["missing_variant"]'::jsonb;
  END IF;

  -- 5. goal — ohne Conversion-Goal kann kein Ergebnis gemessen werden.
  IF NEW.goal IS NULL OR trim(NEW.goal) = '' THEN
    v_issues := v_issues || '["missing_goal"]'::jsonb;
  END IF;

  -- Health-Status/Issues immer aktuell halten (informativ, fürs UI-Badge).
  IF jsonb_array_length(v_issues) > 0 THEN
    NEW.health_status := 'issues';
    NEW.health_issues := v_issues;
  ELSE
    NEW.health_status := 'ok';
    NEW.health_issues := '[]'::jsonb;
  END IF;

  -- Status-Override NUR beim Übergang in 'active' — ein bereits aktiver Test
  -- (OLD.status = 'active') wird durch dieses Update nicht mehr deaktiviert,
  -- selbst wenn ein Pflichtfeld gerade geleert wird. Aktivierung selbst
  -- (INSERT mit status='active', oder UPDATE von einem anderen Status auf
  -- 'active') bleibt geblockt, solange Issues bestehen.
  v_activating := NEW.status = 'active'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active');

  IF v_activating AND jsonb_array_length(v_issues) > 0 THEN
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION compute_test_health() SET search_path = 'public';

-- ab_assign(): draft → active nur, wenn der Test keine offenen Health-Issues
-- hat. health_status wird vom obigen Trigger bei jedem INSERT/UPDATE aktuell
-- gehalten, daher reicht hier ein einfacher Spaltenvergleich ohne
-- Neuberechnung der fünf Felder.
CREATE OR REPLACE FUNCTION ab_assign(p_key text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_split   int;
  v_variant text;
BEGIN
  SELECT traffic_split INTO v_split FROM tests WHERE snippet_key = p_key;
  IF v_split IS NULL THEN
    RETURN NULL;                                -- Test existiert nicht
  END IF;

  v_variant := CASE WHEN random() * 100 < v_split THEN 'B' ELSE 'A' END;

  UPDATE tests
     SET visitors_a = visitors_a + (CASE WHEN v_variant = 'A' THEN 1 ELSE 0 END),
         visitors_b = visitors_b + (CASE WHEN v_variant = 'B' THEN 1 ELSE 0 END),
         status     = CASE WHEN status = 'draft' AND health_status = 'ok' THEN 'active' ELSE status END
   WHERE snippet_key = p_key;

  RETURN v_variant;
END;
$$;

ALTER FUNCTION ab_assign(text) SET search_path = 'public';

INSERT INTO schema_migrations (version) VALUES ('037_test_health_activation_guard')
ON CONFLICT (version) DO NOTHING;
