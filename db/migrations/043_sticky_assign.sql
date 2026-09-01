-- 043_sticky_assign.sql
--
-- Sticky Assignment: ab_assign() entschied mit `random() * 100 < traffic_split`
-- — ein unabhaengiger Muenzwurf bei JEDEM Call. Zusammen mit dem cookieless
-- Default-Modus von ab.js (Zuweisung lebt nur im In-Memory-Store eines
-- Seitenaufrufs) hiess das: jeder Reload wuerfelt neu, derselbe Besucher sieht
-- auf Seite 1 A und auf Seite 2 B, und visitors_a/b zaehlt Page-Views statt
-- Besucher.
--
-- ab_assign_v2() nimmt den Bucket von aussen entgegen (berechnet in
-- ab-tool/lib/assignBucket.ts aus einem gesalzenen Request-Hash) und trennt die
-- Zuweisung von der Zaehlung:
--
--   p_bucket NULL   -> Fallback auf random() (keine Client-IP ermittelbar)
--   p_count  false  -> Wiederkehrer: Variante zurueckgeben, NICHT zaehlen
--
-- ab_assign(text) bleibt unveraendert bestehen. Grund: waehrend des Deploys und
-- bei einem Rollback laufen alte Preview-Instanzen weiter, die die alte
-- Signatur aufrufen. Erst entfernen, wenn v2 in Produktion stabil ist.

CREATE OR REPLACE FUNCTION ab_assign_v2(p_key text, p_bucket int, p_count boolean)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_split   int;
  v_bucket  int;
  v_variant text;
BEGIN
  SELECT traffic_split INTO v_split FROM tests WHERE snippet_key = p_key;
  IF v_split IS NULL THEN
    RETURN NULL;                                -- Test existiert nicht
  END IF;

  -- Kein Bucket vom Aufrufer -> altes Zufallsverhalten. Besser als ein
  -- konstanter Ersatzwert, der alle solchen Requests in denselben Arm schiebt.
  v_bucket := COALESCE(p_bucket, floor(random() * 100)::int);
  v_variant := CASE WHEN v_bucket < v_split THEN 'B' ELSE 'A' END;

  -- Nur der erste Kontakt eines Besuchers zaehlt. Die Aktivierung
  -- draft -> active haengt am Zaehlpfad, damit ein Wiederkehrer auf einem
  -- inzwischen wieder auf draft gesetzten Test ihn nicht still reaktiviert.
  -- Der health_status-Guard stammt unveraendert aus 037.
  IF p_count THEN
    UPDATE tests
       SET visitors_a = visitors_a + (CASE WHEN v_variant = 'A' THEN 1 ELSE 0 END),
           visitors_b = visitors_b + (CASE WHEN v_variant = 'B' THEN 1 ELSE 0 END),
           status     = CASE WHEN status = 'draft' AND health_status = 'ok' THEN 'active' ELSE status END
     WHERE snippet_key = p_key;
  END IF;

  RETURN v_variant;
END;
$$;

ALTER FUNCTION ab_assign_v2(text, int, boolean) SET search_path = 'public';

INSERT INTO schema_migrations (version) VALUES ('043_sticky_assign')
ON CONFLICT (version) DO NOTHING;
