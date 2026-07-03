import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

// GET /api/results/export — Cross-Test-Export aller Ergebnisse als CSV
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  const { data: tests, error } = await supabase
    .from('tests')
    .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, created_at')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    safeError('results:export', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const format = new URL(req.url).searchParams.get('format') || 'json'

  if (format === 'csv') {
    const header = 'id,name,site_url,status,visitors_a,visitors_b,conversions_a,conversions_b,significance,winner,created_at'
    const rows = (tests ?? []).map(t =>
      [
        t.id, `"${(t.name || '').replace(/"/g, '""')}"`, `"${(t.site_url || '').replace(/"/g, '""')}"`,
        t.status, t.visitors_a, t.visitors_b, t.conversions_a, t.conversions_b,
        t.significance, t.winner || '', t.created_at,
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    return new Response(csv, {
      headers: {
        ...corsHeaders('GET, OPTIONS'),
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="variante-results.csv"',
      },
    })
  }

  return Response.json({ tests: tests ?? [] }, { headers: corsHeaders('GET, OPTIONS') })
}
