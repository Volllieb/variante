-- Migration 031 — Kostenbudget für Temp-Sessions
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Plan SEC-06: Der Temp-Session-Pfad hatte an drei Stellen keine Bremse.
--
--   1. /api/temp-session erzeugt unauthentifiziert Sessions (5/min/IP).
--   2. /api/tests: "Temp-User: kein Limit" — beliebig viele Tests pro Session.
--   3. /api/generate: Temp-User übersprangen den Kosten-Check komplett. Die
--      einzige Bremse war `if (isTemp && test.variant_b_html)` — also EINE
--      Gratis-Generierung pro TEST, nicht pro Session.
--
-- Ergebnis: 1 Session -> N Tests -> N kostenlose OpenAI-Generierungen, ohne
-- dass ein einziges Konto registriert werden muss. OPENAI_MAX_MONTHLY_COST
-- greift nicht, weil es an profiles.monthly_gen_cost hängt und Temp-Sessions
-- kein Profil haben.

alter table temp_sessions add column if not exists gen_count integer not null default 0;
alter table temp_sessions add column if not exists test_count integer not null default 0;

comment on column temp_sessions.gen_count is
  'Verbrauchte KI-Generierungen dieser anonymen Session. Hartes Limit in consume_temp_session_gen().';
comment on column temp_sessions.test_count is
  'Angelegte Tests dieser anonymen Session. Hartes Limit in consume_temp_session_test().';

-- ---------------------------------------------------------------------------
-- Atomarer Verbrauch — Check + Increment in EINER Anweisung.
-- Gleiches Muster wie increment_gen_cost (027): kein TOCTOU zwischen
-- Prüfen und Hochzählen, auch nicht bei parallelen Requests.
-- Rückgabe: true = gebucht, false = Limit erreicht.
-- ---------------------------------------------------------------------------
create or replace function consume_temp_session_gen(p_session_id uuid, p_limit integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  update public.temp_sessions
     set gen_count = gen_count + 1
   where id = p_session_id
     and gen_count < p_limit
  returning true;
$$;

create or replace function consume_temp_session_test(p_session_id uuid, p_limit integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  update public.temp_sessions
     set test_count = test_count + 1
   where id = p_session_id
     and test_count < p_limit
  returning true;
$$;

comment on function consume_temp_session_gen is
  'Bucht eine KI-Generierung auf eine Temp-Session. Gibt NULL zurück, wenn das Limit erreicht ist (kein Row-Match).';

-- Nur der Service-Role-Key ruft diese Funktionen auf (aus den API-Routen).
revoke all on function consume_temp_session_gen(uuid, integer)  from public, anon, authenticated;
revoke all on function consume_temp_session_test(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Index für den Circuit-Breaker in /api/temp-session (Plan PERF-04).
-- Die Route zählt bei JEDEM Onboarding-Request mit count:'exact' über
-- created_at — ohne Index ein Seq Scan über eine Tabelle, die (weil der
-- Cleanup-Cron nie lief, Plan OPS-01) monoton wächst.
-- ---------------------------------------------------------------------------
create index if not exists idx_temp_sessions_created on temp_sessions(created_at desc);

-- Redundant: token ist bereits über die UNIQUE-Constraint indiziert.
drop index if exists idx_temp_sessions_token;

insert into schema_migrations (version) values ('031_temp_session_budget')
on conflict (version) do nothing;
