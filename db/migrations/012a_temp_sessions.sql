-- Migration 012 — Temporäre Sessions für Figma-Onboarding
-- Ermöglicht Plugin-Nutzern das Erstellen eines Tests ohne Account.
-- Nach Signup werden die Temp-Tests dem User zugewiesen (Claim).
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. Temp-Sessions Tabelle
-- ---------------------------------------------------------------------------
create table if not exists temp_sessions (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- Index für Token-Lookup (häufigster Query-Pfad)
create index if not exists idx_temp_sessions_token on temp_sessions(token);

-- ---------------------------------------------------------------------------
-- 2. Tests: user_id nullable, temp_session_id Referenz
-- ---------------------------------------------------------------------------
alter table tests alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tests' and column_name = 'temp_session_id'
  ) then
    alter table tests add column temp_session_id uuid references temp_sessions(id) on delete set null;
  end if;
end $$;

create index if not exists idx_tests_temp_session on tests(temp_session_id);

-- ---------------------------------------------------------------------------
-- 3. Cleanup-Funktion: Temp-Sessions älter als 7 Tage löschen
--    Wird via Cron (/api/cron) aufgerufen.
-- ---------------------------------------------------------------------------
create or replace function cleanup_temp_sessions()
returns table(action text, count bigint)
language plpgsql
as $$
declare
  v_count bigint;
begin
  -- Temp-Tests der abgelaufenen Sessions löschen
  with deleted_tests as (
    delete from tests
    where temp_session_id in (
      select id from temp_sessions where created_at < now() - interval '7 days'
    )
    returning id
  )
  select count(*) into v_count from deleted_tests;
  if v_count > 0 then
    return query select 'temp_tests_cleaned'::text, v_count;
  end if;

  -- Abgelaufene Temp-Sessions löschen
  with deleted_sessions as (
    delete from temp_sessions where created_at < now() - interval '7 days'
    returning id
  )
  select count(*) into v_count from deleted_sessions;
  if v_count > 0 then
    return query select 'temp_sessions_cleaned'::text, v_count;
  end if;

  if not found then
    return query select 'noop'::text, 0::bigint;
  end if;
end;
$$;
