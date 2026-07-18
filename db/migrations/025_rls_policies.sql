-- Migration 025 — RLS-Policies für Tabellen ohne Policies
-- Schließt Supabase-Sicherheitswarnungen für stripe_webhook_events,
-- temp_sessions und waitlist.
-- Alle drei Tabellen werden ausschließlich über den Service-Role-Client
-- (lib/supabase.ts) angesprochen. Die Policies blockieren sämtliche
-- anon/authenticated Zugriffe — Service-Role umgeht RLS per bypassrls.
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. stripe_webhook_events — nur Stripe-Webhook + Cron-Cleanup (Service-Role)
-- ---------------------------------------------------------------------------
drop policy if exists "service_role_only" on stripe_webhook_events;
create policy "service_role_only" on stripe_webhook_events
  for all
  using (false);

-- ---------------------------------------------------------------------------
-- 2. temp_sessions — nur Preview-API + Claim + Cron (Service-Role)
-- ---------------------------------------------------------------------------
drop policy if exists "service_role_only" on temp_sessions;
create policy "service_role_only" on temp_sessions
  for all
  using (false);

-- ---------------------------------------------------------------------------
-- 3. waitlist — nur Cron-Cleanup (Service-Role), keine aktive API
-- ---------------------------------------------------------------------------
drop policy if exists "service_role_only" on waitlist;
create policy "service_role_only" on waitlist
  for all
  using (false);
