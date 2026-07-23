import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// Der erste Lauf nach dem GET-Fix arbeitet einen aufgestauten Bestand ab.
export const maxDuration = 300

// POST /api/cron/snapshot-stats — Täglicher Snapshot aller aktiven Tests
// Wird von Vercel Cron täglich um Mitternacht aufgerufen.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
async function run(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

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
        const { error: rpcError } = await supabase.rpc('snapshot_daily_stats', { p_test_id: t.id })
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

  return Response.json({ snapshotted, total: rows.length, timedOut })
}

// Vercel Cron ruft den Pfad per GET auf — die Methode ist in vercel.json
// nicht konfigurierbar. Vorher lag die Arbeit ausschliesslich in POST und
// GET gab nur einen Hinweistext zurueck: KEIN Cron-Job lief jemals
// (Plan OPS-01). Der Authorization: Bearer $CRON_SECRET wird von Vercel
// automatisch mitgeschickt.
export const GET = run
export const POST = run
