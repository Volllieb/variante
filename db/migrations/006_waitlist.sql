-- Migration 006 — Waitlist für Figma-Plugin Pre-Release
-- Einfache Tabelle für E-Mail-Sammler auf der Coming-Soon-Landing.
-- Idempotent. Ausführen im Supabase SQL-Editor.
create table if not exists waitlist (
  id         bigint generated always as identity primary key,
  email      text not null unique,
  created_at timestamptz default now()
);
