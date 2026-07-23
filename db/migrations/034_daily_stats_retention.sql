-- Migration 034 — daily_stats Retention + wizard_drafts Härtung
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Plan NEW-05: daily_stats hatte keine Retention — die Tabelle wächst mit einem
--   Eintrag pro Test und Tag unbegrenzt. cleanup_retention_data() wurde in 033
--   um events- und agent_runs-Retention erweitert, daily_stats aber vergessen.
--
-- Plan DB-05: wizard_drafts.user_id war nullable, aber unique(user_id) greift bei
--   NULL nicht — solche Zeilen sind über keine API erreichbar und unsichtbar.

-- ── 1. daily_stats Retention in cleanup_retention_data() ──
--     Ersetzt die Funktion aus 033 (die selbst die aus 011 ersetzt hat).
--     Alle drei Versionen sind konsolidiert: die Funktion enthält jetzt
--     waitlist (12M), events (12M, verwaist), agent_runs (6M) UND
--     daily_stats (12M).
create or replace function cleanup_retention_data()
returns table(action text, count bigint)
language plpgsql
set search_path = ''
as $$
declare
  v_count bigint;
begin
  -- Waitlist: 12 Monate Retention
  with deleted as (
    delete from public.waitlist where created_at < now() - interval '12 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'waitlist_expired'::text, v_count; end if;

  -- Events: verwaiste Einträge (defensiv, CASCADE sollte greifen)
  with deleted as (
    delete from public.events where test_id not in (select id from public.tests)
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'events_orphaned'::text, v_count; end if;

  -- Events: 12 Monate Retention
  with deleted as (
    delete from public.events where created_at < now() - interval '12 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'events_expired'::text, v_count; end if;

  -- Agent-Runs: 6 Monate Retention
  with deleted as (
    delete from public.agent_runs where created_at < now() - interval '6 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'agent_runs_expired'::text, v_count; end if;

  -- Daily Stats: 12 Monate Retention (NEU — Plan NEW-05)
  with deleted as (
    delete from public.daily_stats where date < now() - interval '12 months'
    returning test_id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'daily_stats_expired'::text, v_count; end if;

  if not found then
    return query select 'noop'::text, 0::bigint;
  end if;
end;
$$;

-- ── 2. wizard_drafts.user_id NOT NULL ──
--     Prüfen, ob NULL-Zeilen existieren (sollten keine).
--       select count(*) from wizard_drafts where user_id is null;
--     Falls >0: die Zeilen gehören zu gelöschten Auth-Usern und können weg.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'wizard_drafts' and column_name = 'user_id'
    and is_nullable = 'YES'
  ) then
    -- Etwaige NULL-Zeilen löschen (verwaiste Drafts ohne Auth-User)
    delete from wizard_drafts where user_id is null;
    alter table wizard_drafts alter column user_id set not null;
  end if;
end $$;

insert into schema_migrations (version) values ('034_daily_stats_retention')
on conflict (version) do nothing;
