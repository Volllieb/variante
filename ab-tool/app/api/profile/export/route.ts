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

  const [profileRes, testsRes, eventsRes, domainsRes] = await Promise.all([
    supabase.from('profiles').select('plan, plan_status, notify_on_winner, created_at').eq('user_id', user.userId).single(),
    supabase.from('tests').select('id, name, site_url, selector, goal, status, traffic_split, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }),
    supabase.from('events').select('test_id, type, message, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }).limit(500),
    supabase.from('domains').select('url, verified, created_at').eq('user_id', user.userId).order('created_at', { ascending: false }),
  ])

  if (profileRes.error) {
    safeError('export:profile', profileRes.error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId: user.userId,
    plan: user.plan,
    profile: profileRes.data ?? null,
    tests: testsRes.data ?? [],
    events: eventsRes.data ?? [],
    domains: domainsRes.data ?? [],
    note: 'This export contains all personal data associated with your Variante account per GDPR Art. 20. Original HTML/CSS content of test elements is NOT included — only metadata and aggregated counters.',
  }

  return Response.json(exportData, {
    headers: {
      ...corsHeaders('GET, OPTIONS'),
      'Content-Disposition': `attachment; filename="variante-export-${user.userId.slice(0, 8)}.json"`,
    },
  })
}
