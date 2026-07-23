-- 020_test_health.sql
-- Health-Check-System: Jeder Test bekommt einen Health-Status und eine Issues-Liste.
-- Ein Test mit Health-Issues kann nicht aktiv sein / keine sinnvollen Ergebnisse liefern.
-- Der Trigger komputiert den Status automatisch bei INSERT und UPDATE.
--
-- ⚠️  Plan DB-02: Das Full-Table-UPDATE weiter unten (Zeile ~81: `UPDATE tests SET
--     name = name;`) ist ein Full-Table-Rewrite auf der heißesten Tabelle. Der
--     Trigger (`trg_test_health`) enthält ein `active → draft`-Downgrade, das
--     laufende Kundentests abschalten KANN, wenn eines der fünf Pflichtfelder
--     fehlt. Diese Migration ist auf Production BEREITS GELAUFEN — ein Re-Run
--     würde erneut alle aktiven Tests gefährden.
--     Fix (für Staging/DR): Backfill batchen, Downgrade aus Trigger entfernen,
--     Prüfung stattdessen im API-Layer beim Aktivieren.

-- Health-Status: 'ok' | 'issues'
ALTER TABLE tests ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'issues';

-- Health-Issues: JSON-Array mit Fehlercodes, z.B. ["missing_selector", "missing_variant"]
ALTER TABLE tests ADD COLUMN IF NOT EXISTS health_issues JSONB DEFAULT '[]'::jsonb;

-- Health-Check-Funktion: Prüft alle Felder, die für einen funktionsfähigen Test nötig sind.
CREATE OR REPLACE FUNCTION compute_test_health()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_issues JSONB := '[]'::jsonb;
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
  -- Blockt die Aktivierung, da ein Test ohne Goal keine verwertbaren Daten liefert.
  IF NEW.goal IS NULL OR trim(NEW.goal) = '' THEN
    v_issues := v_issues || '["missing_goal"]'::jsonb;
  END IF;

  -- Health-Status setzen
  IF jsonb_array_length(v_issues) > 0 THEN
    NEW.health_status := 'issues';
    NEW.health_issues := v_issues;
    -- Test mit Health-Issues darf nicht aktiv sein.
    -- Beim ersten Besuch (ab_assign) wird draft→active gesetzt — das blocken wir.
    IF NEW.status = 'active' THEN
      NEW.status := 'draft';
    END IF;
  ELSE
    NEW.health_status := 'ok';
    NEW.health_issues := '[]'::jsonb;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: vor INSERT und UPDATE health prüfen.
DROP TRIGGER IF EXISTS trg_test_health ON tests;
CREATE TRIGGER trg_test_health
  BEFORE INSERT OR UPDATE ON tests
  FOR EACH ROW
  EXECUTE FUNCTION compute_test_health();

-- Bestehende Tests einmalig durchrechnen.
-- UPDATE mit tatsächlicher Änderung triggert den BEFORE UPDATE Trigger.
UPDATE tests SET
  health_status = 'issues',
  health_issues = '[]'::jsonb
WHERE health_status IS NULL;

-- Jetzt den Trigger auf allen existierenden Tests feuern lassen.
-- Dummy-Update auf eine Spalte, die immer gesetzt ist.
UPDATE tests SET name = name;
