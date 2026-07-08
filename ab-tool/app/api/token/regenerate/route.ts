import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

// POST /api/token/regenerate — Neuen API-Token generieren (alter wird ungültig).
// Blockiert, sobald der User das Figma-Plugin einmal verbunden hat (der Token ist dann
// im Plugin gespeichert und ein Wechsel würde das Plugin disconnected lassen).
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // Prüfen ob Plugin bereits verbunden ist → dann keine Rotation erlaubt
  const { data: profile } = await supabase
    .from('profiles')
    .select('has_figma_plugin')
    .eq('user_id', user.userId)
    .single()

  if (profile?.has_figma_plugin) {
    return Response.json(
      { error: 'token_locked', message: 'Your API token is locked because the Figma plugin is connected. The token is stored in the plugin — regenerating it would disconnect the plugin.' },
      { status: 403, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const newToken = crypto.randomUUID()

  const { data, error } = await supabase
    .from('profiles')
    .update({ api_token: newToken })
    .eq('user_id', user.userId)
    .select('api_token')
    .single()

  if (error || !data) {
    safeError('token:regenerate', error)
    return Response.json({ error: 'failed to regenerate token' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ api_token: data.api_token }, { headers: corsHeaders('POST, OPTIONS') })
}
