-- ============================================================================
-- SEED — KEINE MIGRATION.
--
-- Lag vorher als db/migrations/007_dogfooding.sql in der Migrationskette und
-- brach jeden vollständigen Durchlauf ab: der Platzhalter 'DEINE_USER_ID_HIER'
-- ist keine gültige UUID (`invalid input syntax for type uuid`). Zusätzlich ist
-- es ein einmaliger Daten-Insert ohne `on conflict` — bei jedem Re-Run entsteht
-- ein Duplikat.
--
-- Manuell ausführen, wenn ein Dogfooding-Test gewünscht ist.
-- ============================================================================

-- 007_dogfooding.sql — variante auf eigener Landing-Page (Dogfooding)
-- In Supabase SQL-Editor ausführen: https://supabase.com/dashboard/project/_/sql/new
--
-- VORHER: Deine User-ID aus Supabase Dashboard → Authentication → Users kopieren
-- und unten bei 'DEINE_USER_ID_HIER' einsetzen.

-- 1. Test anlegen (z. B. auf den H1 der Landing-Page)
insert into tests (
  user_id,
  name,
  site_url,
  selector,
  goal,
  status,
  traffic_split
) values (
  'DEINE_USER_ID_HIER',                          -- ← HIER ERSETZEN
  '🦴 Dogfooding — Landing H1',
  'https://www.getvariante.com',
  'h1',                                          -- H1 der Landing-Page
  null,                                           -- kein Goal, nur Badge zeigen
  'active',
  50
);
