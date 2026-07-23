import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

// GET /api/profile/export — DSGVO Art. 20: Datenexport im maschinenlesbaren Format.
// Gibt alle mit dem Nutzerkonto verknüpften Daten als JSON zurück.
export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  // ponytail (Plan LEGAL-02): Der Export deckte nur profiles/tests/events/domains
  // ab — vier von neun Tabellen. Es fehlten agent_runs, site_insights (mit
  // analysis_json die substanziellste Auswertung über den Kunden), wizard_drafts
  // und daily_stats. Das events-Limit war zudem still auf 500 gedeckelt.
  const [
    profileRes, testsRes, eventsRes, domainsRes,
    agentRunsRes, insightsRes, draftRes,
  ] = await Promise.all([
    supabase.from('profiles').select('plan, plan_status, notify_on_winner, created_at').eq('user_id', user.userId).single(),
    supabase.from('tests').select('id, name, site_url, selector, goal, status, traffic_split, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }),
    supabase.from('events').select('test_id, type, message, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }).limit(5000),
    supabase.from('domains').select('url, verified, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }),
    supabase.from('agent_runs').select('domain, page_goal, suggestions_json, tests_created, cost_estimate, finish_reason, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }),
    supabase.from('site_insights').select('domain, page_url, page_goal, detected_industry, analysis_json, top_opportunities, analyzed_at').eq('user_id', user.userId).order('analyzed_at', { ascending: false }),
    supabase.from('wizard_drafts').select('*').eq('user_id', user.userId).maybeSingle(),
  ])

  if (profileRes.error) {
    safeError('export:profile', profileRes.error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  // daily_stats hängt an den Tests des Users (kein direkter user_id-Spaltenbezug).
  const testIds = (testsRes.data ?? []).map((t) => t.id)
  const dailyStatsRes = testIds.length
    ? await supabase.from('daily_stats').select('test_id, date, visitors_a, visitors_b, conversions_a, conversions_b').in('test_id', testIds)
    : { data: [] as unknown[] }

  const eventsTruncated = (eventsRes.data?.length ?? 0) >= 5000

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId: user.userId,
    plan: user.plan,
    profile: profileRes.data ?? null,
    tests: testsRes.data ?? [],
    events: eventsRes.data ?? [],
    eventsTruncated,
    domains: domainsRes.data ?? [],
    agentRuns: agentRunsRes.data ?? [],
    siteInsights: insightsRes.data ?? [],
    wizardDraft: draftRes.data ?? null,
    dailyStats: dailyStatsRes.data ?? [],
    note: 'This export contains all personal data associated with your Variante account per GDPR Art. 20. Original HTML/CSS content of test elements is NOT included — only metadata and aggregated counters.',
  }

  return Response.json(exportData, {
    headers: {
      ...corsHeaders('GET, OPTIONS'),
      'Content-Disposition': `attachment; filename="variante-export-${user.userId.slice(0, 8)}.json"`,
    },
  })
}
