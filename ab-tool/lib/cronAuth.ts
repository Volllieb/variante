/**
 * CRON-Routen-Auth — zentraler Wrapper für alle Vercel Cron Jobs.
 *
 * Vorher: Alle 6 Cron-Routen wiederholten denselben 4-Zeilen-Auth-Check
 * plus GET/POST-Dual-Export mit identischem Kommentar (~36 Zeilen Duplikation).
 *
 * Pattern: `cronRoute(handler)` → { GET, POST }
 *   - Prüft Authorization: Bearer $CRON_SECRET
 *   - Exportiert GET + POST (Vercel Cron ruft per GET auf)
 */

/**
 * Verifiziert den CRON_SECRET Authorization-Header.
 * Gibt null zurück wenn valide, sonst eine 401 Response.
 */
export function verifyCronSecret(req: Request): Response | null {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * CRON-Routen-Wrapper: prüft Auth, wrapped Handler für GET+POST.
 * Vercel Cron ruft den Pfad per GET auf — beide Methoden werden
 * auf denselben Handler gemappt.
 */
export function cronRoute(handler: (req: Request) => Promise<Response>) {
  async function run(req: Request) {
    const authError = verifyCronSecret(req)
    if (authError) return authError
    return handler(req)
  }
  return { GET: run, POST: run }
}
