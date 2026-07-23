-- Migration 011 — Datenbereinigung (DSGVO Retention)
-- - Waitlist: Einträge älter als 12 Monate löschen
-- - Events: Verwaiste Events ohne Test-Referenz löschen (sollte via CASCADE nie vorkommen, aber defensiv)
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- ⚠️  DIESE FUNKTION WURDE IN MIGRATION 033 ERWEITERT.
--    033 fügt Events-Retention (12 Monate) und Agent-Runs-Retention (6 Monate) hinzu.
--    Sollte 011 jemals erneut ausgeführt werden, muss danach 033 erneut laufen.

-- Cleanup-Funktion: Löscht abgelaufene Waitlist-Einträge und verwaiste Events.
-- Wird wöchentlich via Cron (/api/cron/cleanup-data) aufgerufen.
create or replace function cleanup_retention_data()
returns table(action text, count bigint)
language plpgsql
as $$
declare
  v_count bigint;
begin
  -- Waitlist: 12 Monate Retention (DSGVO-konform)
  with deleted as (
    delete from waitlist where created_at < now() - interval '12 months'
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then
    return query select 'waitlist_expired'::text, v_count;
  end if;

  -- Events: Verwaiste Einträge (Test gelöscht aber CASCADE hat nicht gegriffen — defensiv)
  with deleted as (
    delete from events
    where test_id not in (select id from tests)
    returning id
  )
  select count(*) into v_count from deleted;
  if v_count > 0 then
    return query select 'events_orphaned'::text, v_count;
  end if;

  -- Fallback: mindestens eine Zeile zurückgeben, damit der Cron nicht leer läuft
  if not found then
    return query select 'noop'::text, 0::bigint;
  end if;
end;
$$;
