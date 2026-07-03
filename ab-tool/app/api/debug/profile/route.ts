import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return Response.json({ error: 'no user' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    userId: user.id,
    userEmail: user.email,
    profile: profile,
    profileError: error?.message ?? null,
    envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    envKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}