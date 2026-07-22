-- 017_source_tracking.sql
-- First-touch attribution: Woher kam der User?
-- `signup_source` = figma-plugin | chrome-extension | organic | null
-- `signup_plan`  = der Plan-Parameter aus der Signup-URL (free | pro)
-- Wird NUR beim ersten Signup gesetzt, nie überschrieben.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_plan TEXT;
