import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  // Nur echte User (Dashboard-Session) dürfen claimen
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return Response.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  let body: { temp_token?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { temp_token } = body
  if (!temp_token) {
    return Response.json(
      { error: 'temp_token is required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Temp-Session finden
  const { data: session } = await supabase
    .from('temp_sessions')
    .select('id')
    .eq('token', temp_token)
    .single()

  if (!session) {
    return Response.json(
      { error: 'Invalid or expired session' },
      { status: 404, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Tests der Temp-Session zum User transferieren
  const { data: claimed, error: updateError } = await supabase
    .from('tests')
    .update({ user_id: sessionUser.id, temp_session_id: null })
    .eq('temp_session_id', session.id)
    .select('id')

  if (updateError) {
    safeError('claim-tests', updateError)
    return Response.json({ error: 'Failed to claim tests' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // Temp-Session löschen
  await supabase.from('temp_sessions').delete().eq('id', session.id)

  // has_figma_plugin Flag setzen (Plugin-Integration bestätigt)
  await supabase
    .from('profiles')
    .update({ has_figma_plugin: true, last_plugin_sync_at: new Date().toISOString() })
    .eq('user_id', sessionUser.id)

  const testIds = (claimed ?? []).map(t => t.id)

  return Response.json(
    { claimed: testIds.length, test_ids: testIds },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
