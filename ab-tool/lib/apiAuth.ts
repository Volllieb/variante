/**
 * API-Routen-Auth-HOFs — reduzieren Auth-Boilerplate in Route-Handlern.
 *
 * Vorher: Jede Route wiederholte 5+ Zeilen Auth-Check + CORS.
 *
 * withApiAuth:   Für getApiUser-basierte Routes (API-Token, Session, Temp-Token)
 * withSessionAuth: Für getSessionUser-basierte Routes (Dashboard-API, Cookie-only)
 */

import { getApiUser, type ApiUser } from '@/lib/auth'
import { getSessionUser } from '@/lib/supabaseServer'
import { corsHeaders } from '@/lib/cors'

/**
 * Wrapper für getApiUser-basierte API-Routen.
 * Auto: Auth-Check → CORS-Header auf Fehler-Response.
 */
export function withApiAuth(
  handler: (req: Request, user: ApiUser) => Promise<Response>,
  methods: string
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const user = await getApiUser(req)
    if (!user) {
      // Auth-Fehler mit CORS-Headern
      return Response.json(
        { error: 'unauthorized', hint: 'API token missing or invalid — copy it from the dashboard.' },
        { status: 401, headers: corsHeaders(methods) }
      )
    }
    return handler(req, user)
  }
}

/**
 * Wrapper für getSessionUser-basierte API-Routen (Dashboard-API).
 */
export function withSessionAuth(
  handler: (req: Request, userId: string) => Promise<Response>,
  methods: string
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const user = await getSessionUser()
    if (!user) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401, headers: corsHeaders(methods) }
      )
    }
    return handler(req, user.id)
  }
}
