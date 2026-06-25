-- Migration 005 — Auth & Billing (Login & Pricing MVP)
-- Führt Nutzer-Besitz von Tests, Plan-/Abo-Status und einen persönlichen API-Token
-- (für Plugin/Extension) ein. Supabase Auth verwaltet auth.users.
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

-- 1:1-Profil zu jedem Auth-User: Plan, Stripe-Verknüpfung und API-Token.
create table if not exists profiles (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  api_token              text unique not null default gen_random_uuid()::text,
  plan                   text not null default 'free',   -- free | pro | agency
  plan_status            text,                            -- Stripe-Subscription-Status
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz default now()
);

-- Besitzer eines Tests.
alter table tests add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Profil + API-Token automatisch bei Signup anlegen.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS als Defense-in-Depth. Alle App-Routen nutzen den Service-Role-Key und
-- umgehen RLS bewusst; diese Policies schützen nur den (sonst ungenutzten)
-- Anon-/User-JWT-Pfad davor, fremde Daten zu lesen.
alter table profiles enable row level security;
alter table tests    enable row level security;

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  for select using (auth.uid() = user_id);

drop policy if exists tests_owner on tests;
create policy tests_owner on tests
  for select using (auth.uid() = user_id);

-- Hinweis: Bestehende Tests haben user_id = null. Nach dem Anlegen deines Accounts
-- einmalig zuordnen, z. B.:
--   update tests set user_id = '<deine-user-uuid>' where user_id is null;
