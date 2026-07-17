-- Migration 023 — Hybrid-Onboarding (Value vor Snippet)
-- Preview-Tests entstehen VOR Sign-up und Snippet-Install: URL rein, Dual-Screenshot
-- raus. Der Test lebt danach als status='preview' in der DB, wird beim Sign-up
-- geclaimt (→ 'draft') und geht nach Snippet-Verify live (→ 'active').
-- Siehe docs/future-features/hybrid-onboarding-plan.md §3.4.
-- Idempotent. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 0. Voraussetzungen aus 012_temp_sessions.sql — idempotent nachgezogen.
--    Der Hybrid-Flow hängt zur Laufzeit an temp_sessions + tests.temp_session_id
--    (Claim-Pfad) und an nullable user_id (Preview-Tests haben noch keinen User).
--    Falls 012 auf dieser DB nie lief, scheiterte diese Migration sonst mit
--    »column "temp_session_id" does not exist«. Auf DBs mit 012 sind diese
--    Statements No-ops.
-- ---------------------------------------------------------------------------
create table if not exists temp_sessions (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

create index if not exists idx_temp_sessions_token on temp_sessions(token);

alter table tests alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tests' and column_name = 'temp_session_id'
  ) then
    alter table tests add column temp_session_id uuid references temp_sessions(id) on delete set null;
  end if;
end $$;

create index if not exists idx_tests_temp_session on tests(temp_session_id);

-- Cleanup-Funktion aus 012 — wird von /api/cron/cleanup-previews per RPC
-- aufgerufen. create or replace ist idempotent (identisch mit 012).
create or replace function cleanup_temp_sessions()
returns table(action text, count bigint)
language plpgsql
as $$
declare
  v_count bigint;
begin
  with deleted_tests as (
    delete from tests
    where temp_session_id in (
      select id from temp_sessions where created_at < now() - interval '7 days'
    )
    returning id
  )
  select count(*) into v_count from deleted_tests;
  if v_count > 0 then
    return query select 'temp_tests_cleaned'::text, v_count;
  end if;

  with deleted_sessions as (
    delete from temp_sessions where created_at < now() - interval '7 days'
    returning id
  )
  select count(*) into v_count from deleted_sessions;
  if v_count > 0 then
    return query select 'temp_sessions_cleaned'::text, v_count;
  end if;

  if not found then
    return query select 'noop'::text, 0::bigint;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Tests: Preview-Spalten
--    status existiert bereits seit 001_schema.sql (draft | active | paused | done).
--    Neu hinzu kommt der Wert 'preview' — kein Schema-Change, nur ein neuer Zustand.
-- ---------------------------------------------------------------------------
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_original_screenshot_url TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_variant_screenshot_url TEXT;

-- preview_data = { changes: [{ id, selector, css, rationale, highlightColor }],
--                  injectedCss, summary, previewedUrl }
-- injectedCss ist die SAUBERE Live-CSS (nur !important, keine Highlights).
-- Die Highlight-Outlines für den Variant-Screenshot werden serverseitig
-- draufgerechnet (lib/previewAnalyze.ts::buildHighlightCss) und NICHT gespeichert —
-- sie dürfen niemals an echte Besucher ausgeliefert werden.
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_data JSONB;

-- Preview-Tests sind noch keinem Snippet zugeordnet und haben oft mehrere
-- Change-Selektoren. Index für den Claim-Pfad (temp_session_id + status).
CREATE INDEX IF NOT EXISTS idx_tests_status_preview
  ON tests(temp_session_id) WHERE status = 'preview';

-- ---------------------------------------------------------------------------
-- 2. Storage-Bucket für Preview-Screenshots
--    public read (die Bilder werden direkt als <img src> im Browser geladen und
--    an urlbox/OpenAI als image_url weitergereicht), Upload nur via service-role.
--    5 MB Limit — ein 1440x900-PNG liegt bei ~200–800 KB.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('previews', 'previews', true, 5242880, '{image/png}')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Cleanup
--    Bewusst KEINE SQL-Funktion: zu jedem Preview-Test gehören zwei Objekte im
--    Storage-Bucket, und die kann plpgsql nicht löschen. Sonst bliebe der Bucket
--    voll zurück während die Rows verschwinden. Das Aufräumen (Rows + Storage)
--    macht deshalb /api/cron/cleanup-previews, täglich, 24h TTL (Plan §7 Punkt 3).
-- ---------------------------------------------------------------------------
