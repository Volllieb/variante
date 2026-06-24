-- Migration V2.2 — Konfigurierbarer Auto-Gewinner.
-- Zwei pro-Test einstellbare Schwellen ersetzen die bisher hartkodierten Werte
-- in significance.ts (0.95 Signifikanz + 100 Conversions).
--   min_visitors: Mindest-Besucherzahl (gesamt A+B), bevor ein Gewinner möglich ist.
--   min_uplift:   relativer Mindest-Uplift von B gegenüber A (0.05 = +5%).
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

alter table tests add column if not exists min_visitors int   default 100;
alter table tests add column if not exists min_uplift   float default 0.05;
