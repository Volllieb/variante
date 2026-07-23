import { supabase } from '@/lib/supabase'

// GET /api/health — Liveness/Readiness für Uptime-Monitoring (Plan OPS-03).
//
// Vorher gab es keinen Health-Endpunkt; ein Ausfall von /api/resolve — dem
// Endpunkt, an dem das Produkt hängt — wäre erst durch eine Kundenmeldung
// aufgefallen. Ein externer Monitor (z. B. Better Uptime, Vercel Checks) pingt
// diesen Pfad und schlägt Alarm, bevor es jemand meldet.
//
// Prüft die DB-Erreichbarkeit mit einer minimalen, indexierten Query. Kein
// Auth (der Monitor hat keine Session), aber es werden keine Daten geliefert —
// nur ein Status.
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  try {
    // Leichtester mögliche Roundtrip: count über eine kleine Tabelle, head-only.
    const { error } = await supabase
      .from('schema_migrations')
      .select('version', { count: 'exact', head: true })

    if (error) {
      return Response.json(
        { status: 'degraded', db: 'error', latencyMs: Date.now() - startedAt },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return Response.json(
      { status: 'ok', db: 'ok', latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return Response.json(
      { status: 'down', latencyMs: Date.now() - startedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
