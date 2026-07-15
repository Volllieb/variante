-- Migration 021 — Resolve-Hotpath: Host-Filter in der DB statt im JS.
--
-- Problem: /api/resolve holte bis zu 200 nicht-pausierte Tests ALLER Nutzer und
-- filterte den Host erst in JavaScript. Zwei Folgen:
--   1) Ab >200 nicht-pausierten Tests global fielen Tests still aus der Antwort —
--      der A/B-Test des Kunden lief einfach nicht mehr, ohne Fehler.
--   2) Full-Table-Scan bei JEDEM Besucher-Seitenaufruf (resolve läuft pro Pageview).
--
-- Lösung: normalisierte Host-Spalte (generiert, immer synchron mit site_url) + Index.
-- Die Route filtert jetzt per .eq('site_host', host) — das Limit greift pro Host.
--
-- WICHTIG: site_host muss exakt hostOf() aus app/api/resolve/route.ts entsprechen:
--   u.trim().toLowerCase()
--    .replace(/^https?:\/\//, '')   → regexp_replace '^https?://'
--    .replace(/^www\./, '')          → regexp_replace '^www\.'
--    .split('/')[0].split('?')[0].split('#')[0]  → split_part /, ?, #
-- Parität ist durch __tests__/resolve-host.mjs abgesichert. Beim Ändern der einen
-- Seite IMMER die andere mitziehen, sonst fallen Tests still aus dem Resolve.
--
-- Idempotent — mehrfach ausführbar.

ALTER TABLE tests ADD COLUMN IF NOT EXISTS site_host TEXT
  GENERATED ALWAYS AS (
    split_part(
      split_part(
        split_part(
          regexp_replace(
            regexp_replace(lower(btrim(site_url)), '^https?://', ''),
            '^www\.', ''),
          '/', 1),
        '?', 1),
      '#', 1)
  ) STORED;

-- Hotpath: /api/resolve → WHERE site_host = $1 (jeder Besucher-Pageview).
CREATE INDEX IF NOT EXISTS idx_tests_site_host ON tests(site_host);

-- Dashboard/API: /api/tests + dashboard/page.tsx → WHERE user_id = $1 [AND status].
-- Bisher gab es auf tests(user_id) gar keinen Index.
CREATE INDEX IF NOT EXISTS idx_tests_user_status ON tests(user_id, status);
