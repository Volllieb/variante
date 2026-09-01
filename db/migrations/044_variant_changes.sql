-- Migration 044: Änderungsliste (variant_b_changes) + Element-Metadaten
--
-- Step 2 des Wizard wird zur Änderungsliste: variant_b_html/css werden aus
-- variant_b_changes komponiert (delta.ts), die Liste ist die Quelle der
-- Wahrheit. Sie wird in Tests UND Drafts persistiert, damit Resume die Zeilen
-- 1:1 wiederherstellen kann statt sie aus CSS zu rekonstruieren.
--
-- element_type/element_name schliessen die zweite Resume-Lücke: heute steht
-- beim Resume hart 'element' → getEditorCategory liefert immer 'button', und
-- ein Headline-Test bekommt Farb-/Border-Regler angeboten.
--
-- variant_text/explanation auf tests: der Wizard sendet sie seit jeher, die
-- Create-Route verwarf sie stumm — ohne Spalten ginge das nicht zu fixen.
--
-- Alle Spalten nullable: Bestandstests laufen unverändert, ab.js und
-- /api/resolve lesen sie nicht.

ALTER TABLE tests         ADD COLUMN IF NOT EXISTS variant_b_changes jsonb;
ALTER TABLE tests         ADD COLUMN IF NOT EXISTS element_type text;
ALTER TABLE tests         ADD COLUMN IF NOT EXISTS variant_text text;
ALTER TABLE tests         ADD COLUMN IF NOT EXISTS explanation text;
ALTER TABLE wizard_drafts ADD COLUMN IF NOT EXISTS variant_b_changes jsonb;
ALTER TABLE wizard_drafts ADD COLUMN IF NOT EXISTS element_type text;
ALTER TABLE wizard_drafts ADD COLUMN IF NOT EXISTS element_name text;

INSERT INTO schema_migrations (version) VALUES ('044_variant_changes')
ON CONFLICT (version) DO NOTHING;
