import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

// GET /api/events?testId=<uuid> — Activity-Log für einen Test
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  const url = new URL(req.url)
  const testId = url.searchParams.get('testId')

  let query = supabase
    .from('events')
    .select('id, test_id, type, message, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (testId) {
    // Security: nur eigene Events lesen
    const { data: test } = await supabase
      .from('tests')
      .select('user_id')
      .eq('id', testId)
      .single()

    if (!test || test.user_id !== user.userId) {
      return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
    }
    query = query.eq('test_id', testId)
  } else {
    // Ohne testId: alle Events des Users (über tests-Join)
    const { data: userTests } = await supabase
      .from('tests')
      .select('id')
      .eq('user_id', user.userId)

    const ids = (userTests ?? []).map(t => t.id)
    if (ids.length === 0) {
      return Response.json({ events: [] }, { headers: corsHeaders('GET, OPTIONS') })
    }
    query = query.in('test_id', ids)
  }

  const { data, error } = await query

  if (error) {
    safeError('events', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json({ events: data ?? [] }, { headers: corsHeaders('GET, OPTIONS') })
}
