// Agent Run History: GET /api/agent/runs
// Liefert die letzten Agent-Runs des Users für die History-UI im AgentPanel.

import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { supabase } from '@/lib/supabase'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('id, domain, page_goal, suggestions_json, tests_created, tool_calls_count, cost_estimate, finish_reason, created_at')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      safeError('agent-runs-fetch', error)
      return Response.json({ error: 'Failed to fetch agent runs' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
    }

    return Response.json({ runs: data ?? [] }, { headers: corsHeaders('GET, OPTIONS') })
  } catch (err) {
    safeError('agent-runs-fetch', err)
    return Response.json({ error: 'Failed to fetch agent runs' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }
}
