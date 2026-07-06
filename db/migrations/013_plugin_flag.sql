-- 013_plugin_flag.sql
-- Track whether user has successfully connected the Figma plugin at least once.
-- Used by the Dashboard "New test" flow to decide between polling and setup prompt.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_figma_plugin BOOLEAN DEFAULT FALSE;
