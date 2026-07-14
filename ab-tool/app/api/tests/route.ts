import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { revalidatePath } from 'next/cache'

export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, POST, OPTIONS')

  const { data, error } = await supabase
    .from('tests')
    .select(
      'id, name, site_url, status, health_status, health_issues, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, min_visitors, min_uplift, created_at'
    )
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    safeError('tests', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, POST, OPTIONS') })
  }

  return Response.json({ tests: data ?? [], plan: user.plan }, { headers: corsHeaders('GET, POST, OPTIONS') })
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let body: {
    name?: string
    site_url?: string
    selector?: string
    goal?: string
    traffic_split?: number
    min_visitors?: number
    min_uplift?: number
    significance_level?: number
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { name, site_url, selector, goal, traffic_split, min_visitors, min_uplift, significance_level } = body

  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Input-Validierung: Längenlimits verhindern DB-Blähung.
  if (name.length > 256) return Response.json({ error: 'name too long (max 256)' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  if (site_url && site_url.length > 2048) return Response.json({ error: 'site_url too long (max 2048)' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  if (selector && selector.length > 512) return Response.json({ error: 'selector too long (max 512)' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  if (goal && goal.length > 256) return Response.json({ error: 'goal too long (max 256)' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })

  // Gating: Free-Tier erlaubt nur 1 laufenden Test (status != 'done').
  if (user.plan === 'free') {
    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .neq('status', 'done')
    if ((count ?? 0) >= 1) {
      return paymentRequired(
        'POST, OPTIONS',
        'The Free plan allows 1 active experiment. Upgrade to Pro for unlimited tests.'
      )
    }
  }

  // Domain-Gate: site_url muss zu einer verified Domain des Users passen.
  // Wenn keine site_url mitgegeben: auto-fill von verified domain.
  const { data: verifiedDomains } = await supabase
    .from('domains')
    .select('url')
    .eq('user_id', user.userId)
    .eq('verified', true)
    .limit(1) // jeder User hat max 1 verified domain

  const primaryDomain = verifiedDomains?.[0]?.url

  if (!site_url) {
    if (!primaryDomain) {
      return Response.json(
        { error: 'No verified website. Add your website in the dashboard first.' },
        { status: 400, headers: corsHeaders('POST, OPTIONS') }
      )
    }
    // Auto-fill — kein client-seitiger Input nötig.
  } else {
    // Client hat eine URL mitgeschickt — validieren.
    if (!primaryDomain) {
      return Response.json(
        { error: 'No verified website. Add your website in the dashboard first.' },
        { status: 400, headers: corsHeaders('POST, OPTIONS') }
      )
    }

    let testHost = site_url.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
    testHost = testHost.replace(/^www\./, '')

    let domainHost = primaryDomain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')

    if (testHost !== domainHost) {
      return Response.json(
        { error: `site_url must match your verified website (${domainHost}). Got: ${testHost}` },
        { status: 400, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  const effectiveUrl = site_url || primaryDomain!

  const insert: Record<string, unknown> = {
    name,
    site_url: effectiveUrl,
    selector,
    goal,
    traffic_split,
    user_id: user.userId,
  }
  if (typeof min_visitors === 'number') insert.min_visitors = min_visitors
  if (typeof min_uplift === 'number') insert.min_uplift = min_uplift
  if (typeof significance_level === 'number' && [0.9, 0.95, 0.99].includes(significance_level)) insert.significance_level = significance_level

  const { data, error } = await supabase
    .from('tests')
    .insert(insert)
    .select('id, snippet_key')
    .single()

  if (error || !data) {
    safeError('tests', error)
    return Response.json({ error: 'failed to create test' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // Event: Test erstellt
  await supabase.rpc('log_event', {
    p_test_id: data.id,
    p_user_id: user.userId,
    p_type: 'created',
    p_message: `Test "${name}" created`,
  })

  // Erstmaliger Figma-Plugin-Token-Austausch → Flag setzen
  await supabase
    .from('profiles')
    .update({ has_figma_plugin: true })
    .eq('user_id', user.userId)
    .eq('has_figma_plugin', false)

  revalidatePath('/dashboard')
  return Response.json(
    { id: data.id, snippet_key: data.snippet_key },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
