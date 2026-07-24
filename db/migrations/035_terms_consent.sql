-- Migration 035: DSGVO Terms & Privacy Consent Tracking
--
-- Art. 7 DSGVO verlangt nachweisbare Einwilligung. Diese Migration speichert
-- den Zeitpunkt, zu dem der User den Terms und der Privacy Policy zugestimmt hat.
-- Wird beim Signup (Checkbox) und bei Google-OAuth (implied consent) gesetzt.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz DEFAULT null;

COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted Terms & Privacy Policy. null = not yet accepted.';
