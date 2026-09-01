/**
 * API-Routen-Helfer: parseBody — req.json() + Zod-Parse in einem Schritt.
 *
 * Pattern:
 *   const parsed = await parseBody(req, createTestBody, 'POST, OPTIONS')
 *   if (!parsed.ok) return parsed.response
 *   const { name, site_url } = parsed.data  // vollständig typisiert
 */

import { z } from 'zod'
import { corsHeaders } from '@/lib/cors'

/**
 * Parst und validiert den Request-Body gegen ein Zod-Schema.
 * Bei Fehler wird eine 400 JSON-Response mit Feld-Details zurückgegeben.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  methods: string
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: 'invalid json' },
        { status: 400, headers: corsHeaders(methods) }
      ),
    }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'validation failed',
          // Erste Feld-Meldung als message: der Wizard-Drawer liest
          // `err.message ?? err.error` — so landet die konkrete Ursache
          // (z. B. das Goal-Guard-Refine) statt nur "validation failed".
          message: parsed.error.issues[0]?.message,
          details: parsed.error.issues,
        },
        { status: 400, headers: corsHeaders(methods) }
      ),
    }
  }

  return { ok: true, data: parsed.data }
}
