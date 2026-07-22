-- ============================================================================
-- ARCHIVIERT — NICHT ERNEUT AUSFÜHREN.
--
-- Diese Migration droppt eine Tabelle namens `events`. Migration 010 legt
-- ACHT Nummern später eine NEUE Tabelle desselben Namens an — den produktiven
-- Activity-Log. Wer die Migrationen "in aufsteigender Reihenfolge" erneut
-- durchlaufen lässt, löscht damit den Activity-Log inklusive `cascade`.
--
-- Sie hat 2026 einmalig das V1-Schema (experiments/variants/events) abgeräumt
-- und ist seitdem historisch. Sie liegt hier nur zur Nachvollziehbarkeit.
-- ============================================================================

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
