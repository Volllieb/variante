import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { revalidatePath } from 'next/cache'
import { assertOwnedDomain } from '@/lib/domainGate'
import { parseBody } from '@/lib/apiHelpers'
import { createTestBody } from '@/lib/validation'

// Maximale Anzahl Tests pro anonymer Temp-Session (Figma-Onboarding-Vorschau).
const TEMP_SESSION_TEST_LIMIT = 3

export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, POST, OPTIONS')

  const COLUMNS =
    'id, name, site_url, status, health_status, health_issues, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, min_visitors, min_uplift, created_at'

  const isTemp = user.plan === 'temp'
  const { data, error } = await supabase
    .from('tests')
    .select(COLUMNS)
    .eq(isTemp ? 'temp_session_id' : 'user_id', user.userId)
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

  const parsed = await parseBody(req, createTestBody, 'POST, OPTIONS')
  if (!parsed.ok) return parsed.response
  const { name, site_url, selector, goal, traffic_split, min_visitors, min_uplift, significance_level } = parsed.data

  const isTemp = user.plan === 'temp'

  // Gating: Free-Tier erlaubt nur 1 laufenden Test.
  // ponytail: Nur active+paused zählen — draft-Tests blockieren nicht.
  // Temp-User: kein Limit (es gibt nur einen Test im Wizard).
  if (!isTemp && user.plan === 'free') {
    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .in('status', ['active', 'paused'])
    if ((count ?? 0) >= 1) {
      return paymentRequired(
        'POST, OPTIONS',
        'The Free plan allows 1 active experiment. Upgrade to Pro for unlimited tests.'
      )
    }
  }

  // Temp-Sessions: hartes Test-Limit pro Session (Plan SEC-06). Vorher stand
  // hier "Temp-User: kein Limit" — eine unauthentifiziert erzeugte Session
  // konnte beliebig viele Tests anlegen und damit beliebig viele kostenlose
  // KI-Generierungen auslösen.
  if (isTemp) {
    const { data: allowed } = await supabase.rpc('consume_temp_session_test', {
      p_session_id: user.userId,
      p_limit: TEMP_SESSION_TEST_LIMIT,
    })
    if (allowed !== true) {
      return paymentRequired(
        'POST, OPTIONS',
        'Preview limit reached. Sign up for a free account to keep going.'
      )
    }
  }

  // Domain-Gate: site_url muss zu einer verifizierten Domain des Users passen.
  // Temp-Sessions brauchen ihn nicht — ihre Tests werden von /api/resolve
  // grundsätzlich nicht ausgeliefert (dort: user_id is not null).
  let effectiveUrl = site_url || ''

  if (!isTemp) {
    const gate = await assertOwnedDomain(user.userId, site_url)
    if (!gate.ok) {
      return Response.json({ error: gate.error }, { status: gate.status, headers: corsHeaders('POST, OPTIONS') })
    }
    effectiveUrl = gate.siteUrl
  }

  const insert: Record<string, unknown> = {
    name,
    site_url: effectiveUrl,
    selector,
    goal,
    traffic_split,
  }
  if (isTemp) {
    insert.temp_session_id = user.userId
  } else {
    insert.user_id = user.userId
  }
  if (min_visitors !== undefined) insert.min_visitors = min_visitors
  if (min_uplift !== undefined) insert.min_uplift = min_uplift
  if (significance_level !== undefined) insert.significance_level = significance_level

  const { data, error } = await supabase
    .from('tests')
    .insert(insert)
    .select('id, snippet_key')
    .single()

  if (error || !data) {
    safeError('tests', error)
    return Response.json({ error: 'failed to create test' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // Event: Test erstellt (nur für echte User, Temp-User haben keine user_id)
  if (!isTemp) {
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
  }

  revalidatePath('/dashboard')
  return Response.json(
    { id: data.id, snippet_key: data.snippet_key },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
