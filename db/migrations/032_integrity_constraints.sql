-- Migration 032 — CHECK- und Ownership-Constraints
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Plan DB-03 / DB-04. `grep -c "check ("` über db/migrations/ ergab vorher 0:
-- sämtliche Enums waren freier Text, und traffic_split kam ungeprüft aus dem
-- Request-Body in den Insert (/api/tests validierte name, site_url, selector
-- und goal auf Länge — traffic_split nicht).
--
-- Konkrete Folgen ohne diese Constraints:
--   traffic_split = 500  → `random() * 100 < v_split` in ab_assign ist immer
--                          wahr → 100 % Traffic auf B. Der A/B-Test ist stumm
--                          kein Test mehr.
--   status = 'Active'    → für alle Cron-Filter (.in('status',[...])) unsichtbar,
--                          während /api/resolve ihn weiter ausliefert. Daten
--                          laufen, werden aber nie ausgewertet.

-- ---------------------------------------------------------------------------
-- 0. Bestand bereinigen, damit die Constraints greifen können.
--    Vorher prüfen, was da ist:
--      select distinct status from tests;
--      select distinct winner from tests;
--      select distinct plan from profiles;
--      select id, traffic_split from tests where traffic_split not between 0 and 100;
-- ---------------------------------------------------------------------------
update tests set traffic_split = 50
 where traffic_split is null or traffic_split not between 0 and 100;

update tests set status = 'draft'
 where status is null or status not in ('draft', 'active', 'paused', 'done', 'preview');

update tests set winner = null
 where winner is not null and winner not in ('A', 'B');

update tests set health_status = 'issues'
 where health_status is null or health_status not in ('ok', 'issues');

update tests set significance_level = 0.95
 where significance_level is not null and significance_level not in (0.9, 0.95, 0.99);

update profiles set plan = 'free'
 where plan is null or plan not in ('free', 'pro', 'agency');

-- ---------------------------------------------------------------------------
-- 1. Waisen entfernen (Plan DB-04).
--
--    Seit 012a ist tests.user_id nullable und temp_session_id hat
--    ON DELETE SET NULL. Eine Zeile mit beiden NULL ist über KEINE API mehr
--    erreichbar (/api/tests/[id] filtert immer auf eine der beiden Spalten) —
--    also weder löschbar noch editierbar noch im Dashboard sichtbar. Von
--    /api/resolve wurde sie bis Block 1 aber weiterhin an echte Besucher
--    ausgeliefert: nicht abschaltbares HTML auf einer fremden Website.
-- ---------------------------------------------------------------------------
delete from tests
 where user_id is null
   and temp_session_id is null
   and status <> 'preview';

-- ---------------------------------------------------------------------------
-- 2. Constraints. `not valid` + `validate` hält die Sperrzeit auf der
--    heißesten Tabelle kurz (kein Full-Table-Scan unter ACCESS EXCLUSIVE).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tests_status_chk') then
    alter table tests add constraint tests_status_chk
      check (status in ('draft','active','paused','done','preview')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_winner_chk') then
    alter table tests add constraint tests_winner_chk
      check (winner is null or winner in ('A','B')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_split_chk') then
    alter table tests add constraint tests_split_chk
      check (traffic_split between 0 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_minvis_chk') then
    alter table tests add constraint tests_minvis_chk
      check (min_visitors is null or min_visitors >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_siglvl_chk') then
    alter table tests add constraint tests_siglvl_chk
      check (significance_level is null or significance_level in (0.9, 0.95, 0.99)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_health_chk') then
    alter table tests add constraint tests_health_chk
      check (health_status is null or health_status in ('ok','issues')) not valid;
  end if;
  -- Ownership: jeder Test gehört einem User ODER einer Temp-Session.
  if not exists (select 1 from pg_constraint where conname = 'tests_owner_chk') then
    alter table tests add constraint tests_owner_chk
      check (user_id is not null or temp_session_id is not null or status = 'preview') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_plan_chk') then
    alter table profiles add constraint profiles_plan_chk
      check (plan in ('free','pro','agency')) not valid;
  end if;
end $$;

alter table tests    validate constraint tests_status_chk;
alter table tests    validate constraint tests_winner_chk;
alter table tests    validate constraint tests_split_chk;
alter table tests    validate constraint tests_minvis_chk;
alter table tests    validate constraint tests_siglvl_chk;
alter table tests    validate constraint tests_health_chk;
alter table tests    validate constraint tests_owner_chk;
alter table profiles validate constraint profiles_plan_chk;

-- ---------------------------------------------------------------------------
-- 3. Temp-Session-Löschung nimmt ihre Tests mit.
--    Vorher: ON DELETE SET NULL → genau die Waisen aus Schritt 1.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'tests_temp_session_id_fkey' and confdeltype = 'n' -- 'n' = SET NULL
  ) then
    alter table tests drop constraint tests_temp_session_id_fkey;
    alter table tests add constraint tests_temp_session_id_fkey
      foreign key (temp_session_id) references temp_sessions(id) on delete cascade;
  end if;
end $$;

insert into schema_migrations (version) values ('032_integrity_constraints')
on conflict (version) do nothing;
