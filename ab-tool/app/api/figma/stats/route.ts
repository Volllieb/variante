import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

/**
 * GET /api/figma/stats — Stats für das Figma-Plugin (320×360px iframe).
 *
 * ponytaile: Vorher manueller Bearer-Token-Check + eigene Supabase-Query
 * statt getApiUser() aus lib/auth.ts. Jetzt zentraler Auth-Pfad.
 */

export async function OPTIONS() {
  return preflightPublic('GET, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  try {
    const { data: tests } = await supabase
      .from('tests')
      .select('name, status, visitors_a, visitors_b, conversions_a, conversions_b')
      .eq('user_id', user.userId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false })
      .limit(10)

    return Response.json(
      { tests: tests ?? [] },
      {
        headers: {
          ...corsHeadersPublic('GET, OPTIONS'),
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    safeError('figma:stats', err)
    return Response.json({ error: 'server_error' }, { status: 500, headers: corsHeadersPublic('GET, OPTIONS') })
  }
}
