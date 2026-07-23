-- Migration 033 — Indizes für Cron/Export-Pfade + Retention + Hot-Path-Entlastung
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Plan PERF-01 (Sofortmaßnahme) + PERF-02.

-- ---------------------------------------------------------------------------
-- 1. Fehlende Indizes (Plan PERF-02)
--
-- Bis Block 2 liefen die Crons gar nicht (OPS-01), deshalb fiel nie auf, dass
-- ihre Filter-Spalten nicht indiziert sind. Jetzt LAUFEN sie — gegen einen
-- Bestand, der wegen fehlender Retention nur wächst.
-- ---------------------------------------------------------------------------

-- events.user_id: /api/profile/export filtert exakt danach. events wächst
-- unbegrenzt (jeder Statuswechsel schreibt via log_event).
create index if not exists idx_events_user on events(user_id, created_at desc);

-- tests(status): die drei Cron-Queries .in('status',['active','paused']) sind
-- ohne user_id-Prädikat Full Scans. Partial-Index auf die relevante Teilmenge.
create index if not exists idx_tests_status_winner on tests(status) where winner is null;

-- stripe_webhook_events.processed_at: cleanup-webhooks löscht danach.
create index if not exists idx_webhook_processed_at on stripe_webhook_events(processed_at);

-- ---------------------------------------------------------------------------
-- 2. Retention erweitern (Plan PERF-02)
--
-- cleanup_retention_data() löschte in events nur VERWAISTE Zeilen, nie alte.
-- events und agent_runs wachsen sonst monoton.
-- ---------------------------------------------------------------------------
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

  -- Events: 12 Monate Retention (NEU — vorher liefen die nie ab)
  with deleted as (
    delete from public.events where created_at < now() - interval '12 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'events_expired'::text, v_count; end if;

  -- Agent-Runs: 6 Monate Retention (NEU)
  with deleted as (
    delete from public.agent_runs where created_at < now() - interval '6 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then return query select 'agent_runs_expired'::text, v_count; end if;

  if not found then
    return query select 'noop'::text, 0::bigint;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Hot-Path-Sofortmaßnahme (Plan PERF-01)
--
-- ab_assign/ab_convert inkrementieren die Zähler direkt auf der tests-Zeile.
-- 016a_realtime setzte `replica identity full` auf tests — Postgres schreibt
-- dadurch bei JEDEM dieser Updates die vollständige alte Zeile (inkl.
-- original_html/site_css/variant_b_html) ins WAL und durch den Logical-
-- Decoding-Pfad. Auf dem Pageview-Hotpath ist das teuer.
--
-- `replica identity default` schreibt nur noch den Primärschlüssel. Realtime
-- sendet dann bei UPDATE nur geänderte Spalten statt der ganzen Zeile — für die
-- Dashboard-Subscription (Signifikanz/Zähler) völlig ausreichend.
--
-- Die vollständige Auslagerung der Zähler in eine schmale test_counters-Tabelle
-- (Plan PERF-01, P2) bleibt als Folgeschritt; sie braucht koordinierte
-- Änderungen an ab_assign/ab_convert und getExperimentStats und gehört gegen
-- eine Staging-DB getestet.
alter table tests replica identity default;

insert into schema_migrations (version) values ('033_perf_indexes_retention')
on conflict (version) do nothing;
