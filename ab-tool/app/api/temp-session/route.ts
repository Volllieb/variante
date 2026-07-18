import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  // Pro IP: 5 Temp-Sessions pro Minute. Der alte DB-Count zählte global über
  // alle Besucher — ab 5 Onboarding-Demos/Minute bekam JEDER einen 429.
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`temp-session:${ip}`, 5, 60_000))) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Globaler Circuit-Breaker gegen Massen-Erzeugung (DB-basiert, Redis-unabhängig).
  const { count } = await supabase
    .from('temp_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())

  if ((count ?? 0) >= 100) {
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
