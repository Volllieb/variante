-- Migration 030 — RLS auf den drei Tabellen aktivieren, auf denen sie nie anging
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- ============================================================================
-- KRITISCH (Plan SEC-04). Bis zu dieser Migration waren drei Tabellen für
-- jeden Besucher der Website les- UND schreibbar.
-- ============================================================================
--
-- Migration 025 legt auf stripe_webhook_events, temp_sessions und waitlist je
-- eine Policy `using (false)` an — aber ohne vorheriges
-- `alter table … enable row level security`. In Postgres ist eine Policy auf
-- einer Tabelle ohne aktiviertes RLS vollständig wirkungslos; sie wird nie
-- ausgewertet. Der Supabase-Linter meldet das als `policy_exists_rls_disabled`
-- statt `rls_disabled_in_public` — die Warnung wechselte nur den Namen.
--
-- Gleichzeitig widerruft keine Migration die Supabase-Default-Grants
-- (`grant all on tables in schema public to anon, authenticated`). Der Anon-Key
-- steht im Browser-Bundle (NEXT_PUBLIC_SUPABASE_ANON_KEY).
--
-- Konkrete Folgen vor diesem Fix:
--
--   temp_sessions.token         Bearer-Credential. lib/auth.ts akzeptiert
--                               X-Temp-Token und gibt daraufhin eine Session
--                               zurück. `select token from temp_sessions`
--                               genügte zur Übernahme jeder fremden Session.
--
--   waitlist.email              Personenbezogene Daten, frei auslesbar.
--                               Meldepflichtige Panne nach Art. 33 DSGVO.
--
--   stripe_webhook_events       Idempotenz-Tabelle. Der Webhook-Handler
--                               überspringt jedes Event, dessen event_id dort
--                               steht. Anon konnte Zeilen einfügen und damit
--                               Billing-Events gezielt verschlucken.

-- ── 1. RLS aktivieren ──
alter table waitlist              enable row level security;
alter table temp_sessions         enable row level security;
alter table stripe_webhook_events enable row level security;

-- force: gilt auch für den Tabellen-Owner. Der Service-Role-Key umgeht RLS
-- ohnehin (bypassrls), die Server-Routen funktionieren also unverändert.
alter table waitlist              force row level security;
alter table temp_sessions         force row level security;
alter table stripe_webhook_events force row level security;

-- ── 2. Grants entziehen (Defense in Depth) ──
-- RLS ist die zweite Verteidigungslinie. Die erste ist, dass die Rollen die
-- Tabellen gar nicht erst anfassen dürfen.
revoke all on waitlist              from anon, authenticated;
revoke all on temp_sessions         from anon, authenticated;
revoke all on stripe_webhook_events from anon, authenticated;

-- ── 3. Verifikation ──
-- Erwartung: alle drei Zeilen mit relrowsecurity = true UND
-- relforcerowsecurity = true.
--
--   select relname, relrowsecurity, relforcerowsecurity
--   from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relkind = 'r'
--     and relname in ('waitlist','temp_sessions','stripe_webhook_events');
--
-- Gegenprobe mit dem Anon-Key (muss leer bzw. 401/403 liefern):
--   curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/temp_sessions?select=token" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

insert into schema_migrations (version) values ('030_enable_rls_gap')
on conflict (version) do nothing;
