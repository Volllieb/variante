import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let body: {
    testId?: string
    selector?: string
    original_html?: string
    site_css?: string
    framework?: string
    goal_candidates?: { selector: string; text: string }[]
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, selector, original_html, site_css, framework, goal_candidates } = body

  if (!testId || !selector) {
    return Response.json(
      { error: 'testId and selector are required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const { data: updated, error } = await supabase
    .from('tests')
    .update({ selector, original_html, site_css, framework, ...(goal_candidates !== undefined ? { goal_candidates } : {}) })
    .eq('id', testId)
    .eq('user_id', user.userId)
    .select('id')

  if (error) {
    console.error('[capture] update error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('POST, OPTIONS') })
}
