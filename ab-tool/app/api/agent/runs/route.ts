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

  const url = new URL(req.url)
  const winnerCheck = url.searchParams.get('winnerCheck')

  try {
    // ─── Winner-Check: Recent winners without subsequent agent run ───
    if (winnerCheck === '1') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: recentWinners } = await supabase
        .from('tests')
        .select('id, name, winner, created_at')
        .eq('user_id', user.userId)
        .in('winner', ['B'])
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentWinners?.length) {
        // Check ob für diesen Test bereits ein Agent-Run existiert
        const { data: recentRuns } = await supabase
          .from('agent_runs')
          .select('created_at')
          .eq('user_id', user.userId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(5)

        const lastRunTime = recentRuns?.[0]?.created_at
          ? new Date(recentRuns[0].created_at).getTime()
          : 0

        // Nur zeigen wenn kein Agent-Run NACH dem Winner stattfand
        const firstWinner = recentWinners[0]
        const winnerTime = new Date(firstWinner.created_at).getTime()
        if (winnerTime > lastRunTime) {
          return Response.json({
            winner: {
              testName: firstWinner.name,
              winner: firstWinner.winner,
              testId: firstWinner.id,
            },
            dismissed: false,
          }, { headers: corsHeaders('GET, OPTIONS') })
        }
      }

      return Response.json({ winner: null, dismissed: false }, { headers: corsHeaders('GET, OPTIONS') })
    }

    // ─── Normale History ───
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
