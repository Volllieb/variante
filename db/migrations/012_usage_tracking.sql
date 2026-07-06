-- Migration 012 — OpenAI Usage-Tracking & Limit
-- Fügt monthly_gen_cost + monthly_gen_reset zu profiles hinzu.
-- /api/generate prüft vor jedem OpenAI-Call das Limit und inkrementiert danach.
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

alter table profiles add column if not exists monthly_gen_cost numeric not null default 0;
alter table profiles add column if not exists monthly_gen_reset date; -- z. B. '2026-07-01' = Juli-Zähler

comment on column profiles.monthly_gen_cost is 'Geschätzte OpenAI-Kosten im aktuellen Monat (USD). Wird bei Monatswechsel zurückgesetzt.';
comment on column profiles.monthly_gen_reset is 'Monatsstempel für monthly_gen_cost. Weicht das Datum vom aktuellen Monat ab, wird der Zähler zurückgesetzt.';

-- Atomarer Cost-Increment (vermeidet Race-Conditions bei parallelen Requests)
create or replace function increment_gen_cost(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
as $$
begin
  update profiles
  set monthly_gen_cost = coalesce(monthly_gen_cost, 0) + p_amount
  where user_id = p_user_id;
end;
$$;
