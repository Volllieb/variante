-- Migration 016 — Supabase Realtime für Live-Updates
-- Ersetzt Polling (setInterval) durch echte DB-Push-Updates.
-- Idempotent. Ausführen im Supabase SQL-Editor.

-- REPLICA IDENTITY FULL nötig für UPDATE/DELETE Realtime-Events
-- (ohne wird nur der Primary Key im old record gesendet).
alter table tests replica identity full;

-- Tabelle zum Realtime-Publication hinzufügen
alter publication supabase_realtime add table tests;
