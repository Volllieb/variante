import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  // IP-basiertes Rate-Limit: 5 Temp-Sessions pro Minute
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  const { count } = await supabase
    .from('temp_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())

  if ((count ?? 0) >= 5) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const { data, error } = await supabase
    .from('temp_sessions')
    .insert({})
    .select('token')
    .single()

  if (error) {
    safeError('temp-session', error)
    return Response.json({ error: 'Failed to create session' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ token: data.token }, { headers: corsHeaders('POST, OPTIONS') })
}
