import { supabase } from '@/lib/supabase'
import { corsHeaders } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'

export type ApiUser = { userId: string; plan: string }

// Auth für API-Routen — akzeptiert zwei Wege:
//   1. Plugin/Extension: Header `Authorization: Bearer <api_token>` (aus profiles).
//   2. Dashboard (gleiche Origin): eingeloggte Supabase-Session via Cookie.
// So funktioniert z. B. das Speichern von Schwellen auf der Results-Seite für
// den eingeloggten Besitzer, während fremde Betrachter abgewiesen werden.
export async function getApiUser(req: Request): Promise<ApiUser | null> {
  // 1. Bearer-Token
  const header = req.headers.get('authorization') || ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  const token = m && m[1] ? m[1].trim() : ''
  if (token) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, plan')
      .eq('api_token', token)
      .single()
    if (data) return { userId: data.user_id, plan: data.plan }
  }

  // 2. Dashboard-Session (Cookie)
  try {
    const sessionUser = await getSessionUser()
    if (sessionUser) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, plan')
        .eq('user_id', sessionUser.id)
        .single()
      if (data) return { userId: data.user_id, plan: data.plan }
    }
  } catch {
    // cookies() außerhalb eines Request-Kontexts → ignorierbar
  }

  return null
}

// Standard-401 mit CORS-Headern.
export function unauthorized(methods: string): Response {
  return Response.json(
    { error: 'unauthorized', hint: 'API token missing or invalid — copy it from the dashboard.' },
    { status: 401, headers: corsHeaders(methods) }
  )
}

// 402 für Plan-Limits (z. B. Free-Tier-Experimentlimit erreicht).
export function paymentRequired(methods: string, message: string): Response {
  return Response.json(
    { error: 'plan_limit', message, upgrade: true },
    { status: 402, headers: corsHeaders(methods) }
  )
}
