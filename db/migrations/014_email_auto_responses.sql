-- 014_email_auto_responses.sql
-- Track auto-responses sent to cold-outreach senders.
-- Prevents duplicate responses to the same sender within 90 days.

CREATE TABLE IF NOT EXISTS email_auto_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  from_name TEXT,
  category TEXT,
  raw_subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_responses_from ON email_auto_responses(from_email, created_at);
