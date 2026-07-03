-- Migration 010 — Backend-Features: Events, Daily Stats, Domains, Integrations, Notifications
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

-- ============================================================================
-- 1. Activity Log — Event-Tabelle für Test-Lebenszyklus
-- ============================================================================
create table if not exists events (
  id         bigint generated always as identity primary key,
  test_id    uuid not null references tests(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null,                               -- created | started | paused | resumed | winner_detected | done
  message    text,
  created_at timestamptz default now()
);

create index if not exists idx_events_test_id on events(test_id, created_at desc);

-- Hilfsfunktion: Event schreiben
create or replace function log_event(p_test_id uuid, p_user_id uuid, p_type text, p_message text default null)
returns void
language plpgsql
as $$
begin
  insert into events (test_id, user_id, type, message) values (p_test_id, p_user_id, p_type, p_message);
end;
$$;

-- ============================================================================
-- 2. Daily Stats — Zeitreihen für Analytics (Pro-gated)
-- ============================================================================
create table if not exists daily_stats (
  id            bigint generated always as identity primary key,
  test_id       uuid not null references tests(id) on delete cascade,
  date          date not null,
  visitors_a    int default 0,
  visitors_b    int default 0,
  conversions_a int default 0,
  conversions_b int default 0,
  unique(test_id, date)
);

create index if not exists idx_daily_stats_test on daily_stats(test_id, date desc);

-- Snapshottet die aktuellen Aggregat-Counter in daily_stats.
-- Wird via Cron (täglich) oder beim Dashboard-Aufruf getriggert.
create or replace function snapshot_daily_stats(p_test_id uuid)
returns void
language plpgsql
as $$
declare
  v_date date := current_date;
  v_prev daily_stats%rowtype;
  v_cur  tests%rowtype;
begin
  select * into v_cur from tests where id = p_test_id;
  if not found then return; end if;

  -- Vortages-Snapshot als Basis für die Differenz
  select * into v_prev from daily_stats where test_id = p_test_id and date = v_date;

  -- Nur schreiben wenn noch kein Eintrag für heute existiert
  if not found then
    insert into daily_stats (test_id, date, visitors_a, visitors_b, conversions_a, conversions_b)
    values (p_test_id, v_date, v_cur.visitors_a, v_cur.visitors_b, v_cur.conversions_a, v_cur.conversions_b)
    on conflict (test_id, date) do update
    set visitors_a    = excluded.visitors_a,
        visitors_b    = excluded.visitors_b,
        conversions_a = excluded.conversions_a,
        conversions_b = excluded.conversions_b;
  end if;
end;
$$;

-- ============================================================================
-- 3. Domains — Eigenständiges Entity mit Verifizierung
-- ============================================================================
create table if not exists domains (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  url        text not null,
  verified   boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, url)
);

create index if not exists idx_domains_user on domains(user_id);

-- ============================================================================
-- 4. Integrations — Plugin-Sync-Timestamp
-- ============================================================================
alter table profiles add column if not exists last_plugin_sync_at timestamptz;

-- ============================================================================
-- 6. Notifications — Winner-Benachrichtigung
-- ============================================================================
alter table profiles add column if not exists notify_on_winner boolean default true;

-- ============================================================================
-- RLS für neue Tabellen
-- ============================================================================
alter table events      enable row level security;
alter table daily_stats enable row level security;
alter table domains     enable row level security;

drop policy if exists events_owner on events;
create policy events_owner on events
  for select using (auth.uid() = user_id);

drop policy if exists daily_stats_owner on daily_stats;
create policy daily_stats_owner on daily_stats
  for select using (auth.uid() = (select user_id from tests where tests.id = daily_stats.test_id));

drop policy if exists domains_owner on domains;
create policy domains_owner on domains
  for all using (auth.uid() = user_id);
