-- Migration: altes Schema (experiments / variants / events) -> tests
-- Ausführen NACH supabase/schema.sql.
--
-- Phase 0–3 nutzte drei Tabellen. V2 nutzt nur noch `tests`.
-- Die alten Tabellen enthielten nur Test-/Spike-Daten ohne Produktivwert,
-- daher werden sie ersatzlos gedroppt. Falls produktive Daten übernommen
-- werden sollen, vor dem DROP manuell per INSERT ... SELECT übertragen.

drop table if exists events cascade;
drop table if exists variants cascade;
drop table if exists experiments cascade;
