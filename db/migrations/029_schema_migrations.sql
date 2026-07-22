-- Migration 029 — Migrations-Tracking
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Problem (Plan DB-01): Es gab keine Quelle der Wahrheit darüber, welche
-- Migration auf welcher Datenbank gelaufen ist. Migration 023 belegt im Repo
-- selbst, dass der Stand bereits einmal auseinandergelaufen ist — sie musste
-- 57 Zeilen aus 012_temp_sessions nachziehen, weil diese auf einer DB nie lief.
-- Ohne Tracking ist weder Staging noch Disaster-Recovery reproduzierbar.
--
-- Diese Tabelle ist bewusst minimal: kein Migrations-Framework, kein Tool-Wechsel.
-- Jede künftige Migration endet mit einem `insert into schema_migrations`.

create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now(),
  note       text
);

comment on table schema_migrations is
  'Welche Migration aus db/migrations/ ist auf dieser Datenbank gelaufen. Manuell gepflegt (jede Migration trägt sich am Ende selbst ein).';

-- Security: Die Tabelle verrät den Schema-Stand — nichts für den Anon-Key.
alter table schema_migrations enable row level security;
alter table schema_migrations force row level security;
revoke all on schema_migrations from anon, authenticated;

-- ── Backfill: alles bis 028 lief auf Production bereits ──
-- Auf einer FRISCHEN Datenbank diesen Block NICHT ausführen, sondern die
-- Migrationen 001…028 der Reihe nach fahren (002 und 007 sind archiviert bzw.
-- nach db/seeds/ verschoben — siehe die Header dort).
insert into schema_migrations (version, note) values
  ('001_schema',                     'backfill 029'),
  ('003_goal_candidates',            'backfill 029'),
  ('004_winner_config',              'backfill 029'),
  ('005_auth_billing',               'backfill 029'),
  ('006_waitlist',                   'backfill 029'),
  ('008_webhook_idempotency',        'backfill 029'),
  ('009_onboarding_flag',            'backfill 029'),
  ('010_features',                   'backfill 029'),
  ('011_data_cleanup',               'backfill 029'),
  ('012a_temp_sessions',             'backfill 029'),
  ('012b_usage_tracking',            'backfill 029'),
  ('013_plugin_flag',                'backfill 029'),
  ('014_drop_onboarded',             'backfill 029'),
  ('015_domain_gate',                'backfill 029'),
  ('016a_realtime',                  'backfill 029'),
  ('016b_variant_css',               'backfill 029'),
  ('017a_significance_level',        'backfill 029'),
  ('017b_source_tracking',           'backfill 029'),
  ('018_weekly_digest',              'backfill 029'),
  ('019_agent_runs',                 'backfill 029'),
  ('020_test_health',                'backfill 029'),
  ('021_resolve_scaling',            'backfill 029'),
  ('022_avatar_upload',              'backfill 029'),
  ('023_hybrid_onboarding',          'backfill 029'),
  ('024_revoke_security_definer',    'backfill 029'),
  ('025_rls_policies',               'backfill 029'),
  ('026_security_hardening',         'backfill 029'),
  ('027_recreate_increment_gen_cost','backfill 029'),
  ('028_wizard_drafts',              'backfill 029')
on conflict (version) do nothing;

insert into schema_migrations (version) values ('029_schema_migrations')
on conflict (version) do nothing;

-- Prüfen, was fehlt:
--   select version from schema_migrations order by version;
