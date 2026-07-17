import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { claimTempSessionTests, markFigmaPluginUser } from '@/lib/claimTests'

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

  let body: { temp_token?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { temp_token, source } = body
  if (!temp_token) {
    return Response.json(
      { error: 'temp_token is required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Transfer + preview→draft-Promotion (lib/claimTests.ts, geteilt mit auth/callback)
  const { testIds } = await claimTempSessionTests(sessionUser.id, temp_token)

  // has_figma_plugin nur wenn der Claim wirklich aus dem Plugin kommt — seit dem
  // Hybrid-Onboarding claimen auch Website-Previews über diesen Endpoint.
  if (source === 'figma-plugin') await markFigmaPluginUser(sessionUser.id)

  return Response.json(
    { claimed: testIds.length, test_ids: testIds },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
