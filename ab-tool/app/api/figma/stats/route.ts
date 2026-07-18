import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') ?? ''
  const headers = { ...corsHeaders }
  if (origin) headers['Access-Control-Allow-Origin'] = origin

  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers })
    }
    const token = auth.slice(7)
    if (token.length < 32) {
      return Response.json({ error: 'invalid token' }, { status: 401, headers })
    }

    // Find user by API token
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('api_token', token)
      .single()

    if (!profile) {
      return Response.json({ error: 'invalid token' }, { status: 401, headers })
    }

    const { data: tests } = await supabase
      .from('tests')
      .select('name, status, visitors_a, visitors_b, conversions_a, conversions_b')
      .eq('user_id', profile.user_id)
      .in('status', ['live', 'paused'])
      .order('created_at', { ascending: false })
      .limit(10)

    return Response.json({ tests: tests ?? [] }, { headers })
  } catch (err) {
    return Response.json({ error: 'server_error' }, { status: 500, headers })
  }
}
