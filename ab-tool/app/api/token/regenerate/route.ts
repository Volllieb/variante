import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

// POST /api/token/regenerate — Neuen API-Token generieren (alter wird ungültig).
// Setzt has_figma_plugin auf false zurück, weil der alte Token im Plugin damit ungültig wird.
// Der User muss das Plugin nach der Regeneration neu verbinden.
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  const newToken = crypto.randomUUID()

  const { data, error } = await supabase
    .from('profiles')
    .update({ api_token: newToken, has_figma_plugin: false })
    .eq('user_id', user.userId)
    .select('api_token')
    .single()

  if (error || !data) {
    safeError('token:regenerate', error)
    return Response.json({ error: 'failed to regenerate token' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ api_token: data.api_token }, { headers: corsHeaders('POST, OPTIONS') })
}
