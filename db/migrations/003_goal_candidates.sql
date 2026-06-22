-- Migration V2.1 — Goal-Kandidaten für das Plugin-Dropdown.
-- Die Chrome Extension sammelt beim Element-Picken klickbare Elemente
-- ([{selector, text}]); das Figma-Plugin füllt daraus das Conversion-Dropdown.
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

alter table tests add column if not exists goal_candidates jsonb;
