-- Migration 026 — Security Hardening: search_path fix + revoke handle_new_user
-- Behebt 12 von 14 Supabase-Linter-Warnings:
--   1. function_search_path_mutable (10 Funktionen): set search_path = 'public'
--   2. anon/authenticated können handle_new_user() per REST ausführen
-- Nicht gefixt (Dashboard-Setting): leaked_password_protection
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. search_path für alle Funktionen ohne expliziten search_path
--    handle_new_user() (005_auth_billing) hat bereits set search_path = public.
-- ---------------------------------------------------------------------------
alter function ab_assign(text) set search_path = 'public';
alter function ab_convert(text, text) set search_path = 'public';
alter function log_event(uuid, uuid, text, text) set search_path = 'public';
alter function snapshot_daily_stats(uuid) set search_path = 'public';
alter function cleanup_retention_data() set search_path = 'public';
alter function increment_gen_cost(uuid, numeric, numeric) set search_path = 'public';
alter function count_verified_domains(uuid) set search_path = 'public';
alter function count_domains(uuid) set search_path = 'public';
alter function compute_test_health() set search_path = 'public';
alter function cleanup_temp_sessions() set search_path = 'public';

-- ---------------------------------------------------------------------------
-- 2. handle_new_user() — revoke von anon + authenticated
--    024_revoke_security_definer.sql hat nur public revoked.
--    Der Trigger feuert weiterhin (Trigger brauchen kein EXECUTE-Recht).
-- ---------------------------------------------------------------------------
revoke execute on function handle_new_user() from anon;
revoke execute on function handle_new_user() from authenticated;
