-- Migration 008 — Webhook Idempotency
-- Verhindert doppelte Verarbeitung von Stripe-Webhook-Retries.
-- Event-ID als PK → ON CONFLICT = bereits verarbeitet.
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

create table if not exists stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz default now()
);
