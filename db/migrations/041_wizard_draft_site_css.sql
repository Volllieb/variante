-- Migration 041 — site_css auf wizard_drafts
--
-- Der Element-Picker (public/ab.js) sammelt mit collectCss() die Styles der
-- Zielseite ein. Bis 08/2026 kam davon nur der Figma-/Plugin-Pfad in der DB an
-- (/api/capture -> tests.site_css); der Dashboard-Wizard hat sie verworfen.
-- Folge: die Varianten-Vorschau rendert Buttons im Browser-Default statt so,
-- wie sie auf der Kundenseite aussehen. tests.site_css existiert bereits, den
-- Drafts fehlte die Spalte.
--
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

alter table wizard_drafts add column if not exists site_css text;
