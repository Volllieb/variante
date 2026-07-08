-- 014_drop_onboarded.sql
-- Onboarding-Gate entfernt (08.07.2026). /dashboard/setup (Health-Check)
-- deckt den Setup-Flow ab, separates onboarding-Gate ist redundant.
-- profiles.onboarded wird nirgends mehr gelesen.

ALTER TABLE profiles DROP COLUMN IF EXISTS onboarded;
