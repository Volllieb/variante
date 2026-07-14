-- Migration 017 — Konfigurierbares Signifikanzniveau
-- Ermöglicht Nutzern die Wahl zwischen 90% / 95% / 99% Konfidenz.
-- Default 0.95 (95%), wie bisher. Idempotent.
ALTER TABLE tests ADD COLUMN IF NOT EXISTS significance_level float DEFAULT 0.95;
