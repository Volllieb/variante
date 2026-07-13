-- Migration 018 — Weekly Digest Opt-in
-- Führt notify_on_weekly_digest (opt-out, default true) und 
-- last_digest_sent_at für Dedup ein.
-- Idempotent. Ausführen im Supabase SQL-Editor.

alter table profiles add column if not exists notify_on_weekly_digest boolean default true;
alter table profiles add column if not exists last_digest_sent_at timestamptz;
