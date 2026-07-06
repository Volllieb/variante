import { supabase } from '@/lib/supabase'

// Temporärer Endpoint zum Ausführen fehlender Migrationen.
// Wird nach Ausführung wieder gelöscht.
export async function GET() {
  const results: string[] = []

  // Migration 009: onboarded column
  const { error: e1 } = await supabase.rpc('run_sql', {
    sql: 'alter table profiles add column if not exists onboarded boolean not null default true; alter table profiles alter column onboarded set default false;'
  }).maybeSingle()
  results.push('009_onboarded: ' + (e1 ? '❌ ' + e1.message : '✅'))

  // Migration 010: events, daily_stats, domains, profile columns
  const sql010 = `
    create table if not exists events (
      id bigint generated always as identity primary key,
      test_id uuid not null,
      user_id uuid,
      type text not null,
      message text,
      created_at timestamptz default now()
    );
    create index if not exists idx_events_test_id on events(test_id, created_at desc);
    
    create table if not exists daily_stats (
      id bigint generated always as identity primary key,
      test_id uuid not null,
      date date not null,
      visitors_a int default 0,
      visitors_b int default 0,
      conversions_a int default 0,
      conversions_b int default 0,
      unique(test_id, date)
    );
    create index if not exists idx_daily_stats_test on daily_stats(test_id, date desc);
    
    create table if not exists domains (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      url text not null,
      verified boolean default false,
      verified_at timestamptz,
      created_at timestamptz default now(),
      unique(user_id, url)
    );
    create index if not exists idx_domains_user on domains(user_id);
    
    alter table profiles add column if not exists last_plugin_sync_at timestamptz;
    alter table profiles add column if not exists notify_on_winner boolean default true;
  `

  const { error: e2 } = await supabase.rpc('run_sql', { sql: sql010 }).maybeSingle()
  results.push('010_features: ' + (e2 ? '❌ ' + e2.message : '✅'))

  // Verify
  const checks: Record<string, boolean> = {}
  for (const tbl of ['events', 'daily_stats', 'domains']) {
    const { error } = await supabase.from(tbl).select('count(*)', { count: 'exact', head: true })
    checks[tbl] = !error
  }
  const { error: obErr } = await supabase.from('profiles').select('onboarded').limit(1)
  checks['onboarded_col'] = !obErr

  return Response.json({ results, checks })
}