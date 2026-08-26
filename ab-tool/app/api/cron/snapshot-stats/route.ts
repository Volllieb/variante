import { supabase } from '@/lib/supabase'
import { safeError, safeLog } from '@/lib/safeLog'
import { cronRoute } from '@/lib/cronAuth'

// Der erste Lauf nach dem GET-Fix arbeitet einen aufgestauten Bestand ab.
export const maxDuration = 300

// POST /api/cron/snapshot-stats — Täglicher Snapshot aller aktiven Tests
// Wird von Vercel Cron täglich um Mitternacht (UTC) aufgerufen.
//
// Bewusst finalize_daily_stats (= Snapshot auf current_date - 1): Um 00:00 ist
// der noch nicht verbuchte Traffic gestern entstanden. Vorher landete er in der
// Zeile des NEUEN Tages, wodurch der Vortag im Chart auf 0 stehen blieb
// (Migration 039).

export const { GET, POST } = cronRoute(async (_req) => {

  // Alle aktiven und pausierten Tests snapshoten
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id')
    .in('status', ['active', 'paused'])

  if (error) {
    safeError('cron:snapshot-stats', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  // ponytail: Vorher eine strikt sequenzielle Schleife ueber ALLE Tests. Weil
  // der Cron nie lief (Plan OPS-01), war das nie aufgefallen — beim ersten
  // echten Lauf gegen einen gewachsenen Bestand haette er in die
  // Function-Timeout gelaufen. Jetzt in Bloecken parallel, mit Budget.
  const rows = tests ?? []
  const BATCH = 25
  let snapshotted = 0
  const deadline = Date.now() + 240_000 // 4 min von maxDuration 300 s
  let timedOut = false

  for (let i = 0; i < rows.length; i += BATCH) {
    if (Date.now() > deadline) {
      timedOut = true
      break
    }
    const results = await Promise.all(
      rows.slice(i, i + BATCH).map(async (t) => {
        const { error: rpcError } = await supabase.rpc('finalize_daily_stats', { p_test_id: t.id })
        return !rpcError
      })
    )
    snapshotted += results.filter(Boolean).length
  }

  if (timedOut) {
    safeError('cron:snapshot-stats', {
      message: `Zeitbudget erschoepft nach ${snapshotted}/${rows.length} Tests`,
    })
  }

  safeLog('info', 'cron:snapshot-stats', 'completed', { snapshotted, total: rows.length, timedOut })
  return Response.json({ snapshotted, total: rows.length, timedOut })
})
