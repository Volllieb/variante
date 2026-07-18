-- Migration 028 — wizard_drafts + auto_generated_name
-- Speichert partiellen Wizard-Fortschritt für neue Test-Erstellung (Web).
-- Zusätzlich: auto_generated_name-Spalte auf tests für KI-generierte Testnamen.
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

-- 1. wizard_drafts Tabelle — ein Draft pro User (unique constraint)
create table if not exists wizard_drafts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  step            smallint not null default 0,
  url             text,
  selector        text,
  original_html   text,
  variant_b_html  text,
  variant_b_css   text,
  variant_text    text,
  goal            text,
  goal_selector   text,
  auto_name       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

-- 2. auto_generated_name auf tests für KI-generierte Testnamen
alter table tests add column if not exists auto_generated_name text;

-- 3. RLS für wizard_drafts
alter table wizard_drafts enable row level security;
drop policy if exists "users_own_drafts" on wizard_drafts;
create policy "users_own_drafts" on wizard_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. updated_at Trigger
create or replace function update_wizard_draft_timestamp()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wizard_drafts_updated on wizard_drafts;
create trigger trg_wizard_drafts_updated
  before update on wizard_drafts
  for each row execute function update_wizard_draft_timestamp();
