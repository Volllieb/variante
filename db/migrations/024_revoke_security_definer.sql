-- Migration 024 — Security: Revoke PUBLIC EXECUTE auf SECURITY DEFINER Functions
-- Supabase Security Advisory fix: handle_new_user() hat SECURITY DEFINER und war von PUBLIC
-- aufrufbar. Der Trigger funktioniert weiterhin (Trigger brauchen kein EXECUTE-Recht für den Aufrufer).
-- Idempotent.

revoke execute on function handle_new_user() from public;
