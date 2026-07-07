import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'

export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

// GET /api/token — API-Token-Info
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, POST, OPTIONS')
  return Response.json({
    message: 'Use POST /api/token/regenerate to rotate your API token.',
  }, { headers: corsHeaders('GET, POST, OPTIONS') })
}
