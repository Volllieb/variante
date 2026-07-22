-- Migration 012 — OpenAI Usage-Tracking & Limit
-- Fügt monthly_gen_cost + monthly_gen_reset zu profiles hinzu.
-- /api/generate prüft das Limit und inkrementiert atomar via RPC.
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new
-- ⚠️ NICHT ERNEUT AUSFÜHREN. Diese Datei enthält ein `create or replace function
--    increment_gen_cost` OHNE `set search_path`. Migration 027 hat genau das
--    repariert (Privilege-Escalation-Härtung). Ein Re-Run von 012b nach 027
--    würde den Fix lautlos zurücksetzen.
--    Die Funktionsdefinition unten ist deshalb nur noch historisch — die
--    gültige Version steht in 027_recreate_increment_gen_cost.sql.

alter table profiles add column if not exists monthly_gen_cost numeric not null default 0;
alter table profiles add column if not exists monthly_gen_reset date; -- z. B. '2026-07-01' = Juli-Zähler

comment on column profiles.monthly_gen_cost is 'Geschätzte OpenAI-Kosten im aktuellen Monat (USD). Wird bei Monatswechsel zurückgesetzt.';
comment on column profiles.monthly_gen_reset is 'Monatsstempel für monthly_gen_cost. Weicht das Datum vom aktuellen Monat ab, wird der Zähler zurückgesetzt.';

-- Atomarer Cost-Increment mit Monats-Reset & Limit-Check.
-- Führt Reset + Check + Increment in EINER Transaktion aus — kein TOCTOU.
-- Returns true wenn incrementiert, false wenn Limit überschritten.
create or replace function increment_gen_cost(p_user_id uuid, p_amount numeric, p_limit numeric)
returns boolean
language plpgsql
as $$
declare
  v_reset date;
  v_current numeric;
  v_month date;
begin
  v_month := date_trunc('month', now())::date;

  select monthly_gen_reset, monthly_gen_cost into v_reset, v_current
  from profiles where user_id = p_user_id;

  -- Monatswechsel oder Erstaufruf → Reset auf p_amount
  if v_reset is null or v_reset <> v_month then
    update profiles
    set monthly_gen_cost = p_amount, monthly_gen_reset = v_month
    where user_id = p_user_id;
    return true;
  end if;

  -- Limit-Prüfung (vor Increment, gleiche Transaktion)
  if coalesce(v_current, 0) + p_amount > p_limit then
    return false;
  end if;

  -- Increment
  update profiles
  set monthly_gen_cost = monthly_gen_cost + p_amount
  where user_id = p_user_id;
  return true;
end;
$$;
