-- Migration 036: Server-generierte In-App-Notifications
--
-- Ersetzt das rein client-seitige localStorage-Notification-System durch
-- eine server-seitige Tabelle. Cron-Jobs und API-Endpunkte können jetzt
-- Notifications für User anlegen, das NotificationCenter pollt /api/notifications.
--
-- Typen:
--   test_done     — Winner deklariert
--   significance  — Test nähert sich Signifikanz (Pre-Winner-Warning)
--   warning       — Health-Issue / SRM / Fehler
--   tip           — Onboarding-Tipp / "Was als nächstes testen"

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('test_done', 'significance', 'warning', 'tip')),
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  href        text,                          -- optionaler Deep-Link (z. B. /dashboard/results/:id)
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index für Polling: User holt nur eigene, ungelesene zuerst
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

-- Index für Cleanup: alte gelesene Notifications löschen (im Cron cleanup-data).
-- Kein partial index mit NOW() — NOW() ist STABLE, nicht IMMUTABLE, und
-- PostgreSQL erlaubt im Index-Prädikat nur IMMUTABLE-Funktionen.
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON notifications (read, created_at);

-- RLS: User sehen nur ihre eigenen Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service-Role-Bypass für Cron-Jobs (RLS greift nicht bei service_role):
-- Cron-Jobs schreiben mit supabase (service_role), nicht mit supabaseServer (user).
-- Das funktioniert ohne zusätzliche Policy, da RLS service_role umgeht.
