-- Migration 019 — Agent Runs & Site Insights
-- Autonomer CRO-Agent (/api/agent): Audit-Log pro Durchlauf + akkumulierte
-- Seiten-Insights für den späteren Learning Loop (v2).
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

-- Tabelle für Agent-Durchläufe (Audit + Cost-Tracking)
create table if not exists agent_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(user_id) on delete cascade,
  domain           text not null,
  page_goal        text default 'signups',
  suggestions_json jsonb,                       -- Array von CRO-Vorschlägen
  tests_created    uuid[],                      -- Array von test-ids
  tool_calls_count integer default 0,
  cost_estimate    numeric(10, 6) default 0.0,  -- in USD
  finish_reason    text,                        -- 'stop', 'tool-calls', 'error'
  created_at       timestamptz default now()
);

create index if not exists idx_agent_runs_user on agent_runs(user_id, created_at desc);

-- Tabelle für akkumulierte Site-Insights (Learning Loop v2 — wird vom Agent
-- noch nicht befüllt, Schema steht bereit)
create table if not exists site_insights (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(user_id) on delete cascade,
  domain            text not null,
  page_url          text not null,
  page_goal         text,
  detected_industry text,

  -- Analyse-Ergebnisse
  analysis_json     jsonb,        -- Vollständige Heuristik + AI-Analyse
  top_opportunities jsonb,        -- Top 3 Vorschläge mit Rationale
  analyzed_at       timestamptz default now(),

  -- Feedback aus abgeschlossenen Tests
  test_results_json jsonb,        -- Ergebnisse der Tests, die hier vorgeschlagen wurden
  effective_uplift  numeric(5,2), -- Aggregierter Uplift aus umgesetzten Vorschlägen

  updated_at        timestamptz default now(),
  unique(user_id, domain, page_url)
);

create index if not exists idx_site_insights_user on site_insights(user_id, domain);

-- RLS: User sehen nur eigene Agent-Runs (Writes macht die Service-Role via API)
alter table agent_runs enable row level security;
drop policy if exists "Users view own agent runs" on agent_runs;
create policy "Users view own agent runs" on agent_runs
  for select using (auth.uid() = user_id);

-- RLS: User sehen nur eigene Insights
alter table site_insights enable row level security;
drop policy if exists "Users view own insights" on site_insights;
create policy "Users view own insights" on site_insights
  for select using (auth.uid() = user_id);
