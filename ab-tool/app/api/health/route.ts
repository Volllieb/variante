import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

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

// Probe für den Modulpfad, an dem /api/resolve hängt.
//
// Am 25.08.2026 lieferte /api/resolve auf JEDER Methode — auch OPTIONS, also
// noch vor jedem Handler-Code — die statische /500-Seite: die Function stürzte
// beim Modul-Init ab, kein Kunde bekam mehr eine Variante. Alle 19 anderen
// API-Routen liefen normal. Der einzige Import, den nur /api/resolve hat, ist
// lib/sanitize → isomorphic-dompurify → jsdom.
//
// Lokal ist das nicht reproduzierbar (`next start` läuft neben dem echten
// node_modules), deshalb prüft der Health-Check es jetzt IN der Produktion.
// Nach außen geht nur ein grober Code — die eigentliche Fehlermeldung landet
// über safeError im Vercel-Log, nicht in der Antwort.
type Probe = { status: 'ok' | 'import-failed'; detail?: string; node?: string }

// TEMPORAER (25.08.2026): detail + node sind Diagnose fuer den laufenden
// Ausfall und fliegen raus, sobald die Ursache behoben ist. Beides ist
// unkritisch — Modul-Aufloesefehler enthalten nur Pfade und Paketnamen,
// keine Secrets.
function detailOf(err: unknown): string {
  const e = err as { code?: string; message?: string }
  const code = e?.code ? String(e.code) : 'ERROR'
  return (code + ': ' + String(e?.message ?? err)).slice(0, 200)
}

async function probeSanitize(): Promise<Probe> {
  const node = process.version
  // Einzeln pruefen, damit sichtbar wird, WELCHE Stufe der Kette bricht:
  // lib/sanitize -> isomorphic-dompurify -> jsdom.
  for (const spec of ['jsdom', 'dompurify', 'isomorphic-dompurify'] as const) {
    try {
      await import(/* webpackIgnore: true */ spec)
    } catch (err) {
      safeError('health:sanitize:' + spec, err instanceof Error ? err : new Error(String(err)))
      return { status: 'import-failed', detail: spec + ' -> ' + detailOf(err), node }
    }
  }
  try {
    const mod = await import('@/lib/sanitize')
    mod.sanitizeHtml('<b>probe</b>')
    mod.sanitizeCss('a{color:red}')
    return { status: 'ok', node }
  } catch (err) {
    safeError('health:sanitize', err instanceof Error ? err : new Error(String(err)))
    return { status: 'import-failed', detail: 'lib/sanitize -> ' + detailOf(err), node }
  }
}

export async function GET() {
  const startedAt = Date.now()
  const probe = await probeSanitize()
  const sanitize = probe.status
  const diag = { sanitize, sanitizeDetail: probe.detail, node: probe.node }

  try {
    // Leichtester mögliche Roundtrip: count über eine kleine Tabelle, head-only.
    const { error } = await supabase
      .from('schema_migrations')
      .select('version', { count: 'exact', head: true })

    if (error) {
      return Response.json(
        { status: 'degraded', db: 'error', ...diag, latencyMs: Date.now() - startedAt },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // sanitize kaputt = /api/resolve ist tot, auch wenn die DB antwortet.
    if (sanitize !== 'ok') {
      return Response.json(
        { status: 'degraded', db: 'ok', ...diag, latencyMs: Date.now() - startedAt },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return Response.json(
      { status: 'ok', db: 'ok', ...diag, latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return Response.json(
      { status: 'down', ...diag, latencyMs: Date.now() - startedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
