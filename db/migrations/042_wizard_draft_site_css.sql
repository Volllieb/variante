-- Migration 042: wizard_drafts.site_css
--
-- Das Delta-Modell des Wizard-Editors (B erbt A) braucht A's Site-CSS in zwei
-- Momenten: fuer die Review-Vorschau mit echtem Seiten-CSS und als Kontext
-- beim Fortsetzen eines Drafts. Der Picker misst es seit jeher (collectCss in
-- ab.js) — gespeichert wurde es im Wizard-Pfad aber nie, obwohl die Spalte
-- tests.site_css seit 001 existiert. Der Draft verliert den Kontext also bei
-- jedem Tab-Schliessen, und Wizard-Tests liefen mit leerem site_css auf.

ALTER TABLE wizard_drafts ADD COLUMN IF NOT EXISTS site_css text;

INSERT INTO schema_migrations (version) VALUES ('042_wizard_draft_site_css')
ON CONFLICT (version) DO NOTHING;
