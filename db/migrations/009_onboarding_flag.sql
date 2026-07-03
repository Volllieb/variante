-- Migration 009 — Onboarding-Flag
-- Bisher wurde /onboarding nur direkt nach dem Signup-Redirect erreicht — das
-- greift nicht, wenn Supabase eine E-Mail-Bestätigung verlangt (User landet nach
-- Klick auf den Bestätigungslink auf /login, nicht /onboarding) oder bei
-- Google-Signup ohne source-Param. `onboarded` macht die Prüfung zustandsbasiert:
-- /dashboard leitet auf /onboarding um, bis das Flag gesetzt ist — unabhängig
-- vom Eintrittspfad. Idempotent. Ausführen im Supabase SQL-Editor.

-- Bestehende Profile gelten als bereits onboarded (default true beim Anlegen
-- der Spalte, backfillt alle Bestandszeilen) — sonst würden aktive Nutzer
-- beim nächsten Dashboard-Aufruf unerwartet zurück ins Onboarding geschickt.
alter table profiles add column if not exists onboarded boolean not null default true;

-- Ab jetzt starten neue Profile mit onboarded = false, bis sie /onboarding
-- durchlaufen haben (siehe app/onboarding/page.tsx).
alter table profiles alter column onboarded set default false;
