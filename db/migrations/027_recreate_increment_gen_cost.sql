-- Migration 027 — increment_gen_cost mit set search_path neu bauen
-- Migration 026 (alter function) hat eine Instanz gefixt, aber increment_gen_cost
-- tauchte in der Linter-Liste doppelt auf (zwei Cache-Keys) — vermutlich Ghost
-- durch Re-Run. create or replace mit set search_path inline fixt beide.
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new
--
-- Nicht gefixt (harmlos, Dashboard-Toggle):
--   auth_leaked_password_protection → Authentication → Settings →
--   "Enable leaked password protection". Kein Code-Fix möglich.

create or replace function increment_gen_cost(p_user_id uuid, p_amount numeric, p_limit numeric)
returns boolean
language plpgsql
set search_path = 'public'
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
