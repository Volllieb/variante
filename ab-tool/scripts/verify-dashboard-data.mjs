/**
 * Prüft die Dashboard-Overview gegen echte Daten.
 *
 * Der Umbau der Overview (Zeitraum-KPIs, Trend, Scan-Verbrauch) hängt an drei
 * Dingen, die sich lokal nicht testen lassen — .env.local enthält nur
 * Supabase-Platzhalter, und ohne Login kommt man nicht auf /dashboard:
 *
 *   1. Das PostgREST-Embedding `tests!inner(user_id)`. Schlägt es fehl, kommt
 *      `data: null` zurück — die Zeitraum-KPIs zeigen dann still 0 statt eines
 *      Fehlers. Genau die Art Bug, die niemand meldet.
 *   2. Ob `daily_stats` überhaupt Zeilen hat. Der Trend erscheint erst ab zwei
 *      Tagen; ohne laufenden snapshot-stats-Cron bleibt er für alle leer.
 *   3. Die Invariante aus Migration 039: Summe der Tagesdeltas == Zählerstand
 *      in `tests`. Das ist dieselbe Zusage, die die KPI-Kachel "All time" dem
 *      Kunden macht.
 *
 * Ausführen (Service-Role-Key nötig, liest nur):
 *
 *   vercel env pull .env.production.local --environment production
 *   node --env-file=.env.production.local scripts/verify-dashboard-data.mjs
 *
 * Oder mit explizit gesetzten Variablen:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/verify-dashboard-data.mjs
 *
 * Optional: --user <uuid> prüft nur einen Account.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.')
  process.exit(2)
}
if (url.includes('placeholder') || key.includes('placeholder')) {
  console.error('✗ Platzhalter-Credentials — das prüft nichts.')
  process.exit(2)
}
// `vercel env pull` schreibt für als "Sensitive" markierte Variablen den
// Literalwert [SENSITIVE]. Die Supabase-Keys dieses Projekts sind so markiert
// (Stand 27.08.2026) — sie lassen sich nicht per CLI abrufen und müssen aus
// dem Supabase-Dashboard kommen.
if (url.includes('[SENSITIVE]') || key.includes('[SENSITIVE]')) {
  console.error('✗ Die Env-Datei enthält [SENSITIVE]-Platzhalter statt echter Werte.')
  console.error('  Die Supabase-Variablen sind in Vercel als Sensitive markiert und')
  console.error('  kommen per `vercel env pull` nicht mit. Werte aus dem Supabase-')
  console.error('  Dashboard (Settings → API) in die Datei eintragen.')
  process.exit(2)
}

const userArg = process.argv.indexOf('--user')
const onlyUser = userArg !== -1 ? process.argv[userArg + 1] : null

const supabase = createClient(url, key, { auth: { persistSession: false } })

let failed = 0
const ok = (msg) => console.log('✓', msg)
const bad = (msg) => { failed++; console.error('✗', msg) }
const info = (msg) => console.log(' ', msg)

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)
const DAY = 86_400_000

/* ── Welche User prüfen? ── */

let userIds = []
if (onlyUser) {
  userIds = [onlyUser]
} else {
  const { data, error } = await supabase.from('tests').select('user_id').limit(2000)
  if (error) {
    bad(`tests-Query fehlgeschlagen: ${error.message}`)
    process.exit(1)
  }
  userIds = [...new Set((data ?? []).map((r) => r.user_id))]
}

if (userIds.length === 0) {
  console.log('Keine Accounts mit Tests gefunden — nichts zu prüfen.')
  process.exit(0)
}
info(`${userIds.length} Account(s) mit Tests`)

/* ── 1. Das Embedding aus app/dashboard/page.tsx, wörtlich ── */

const statsSince = dayKey(Date.now() - 60 * DAY)
const probeUser = userIds[0]

const embedded = await supabase
  .from('daily_stats')
  .select('test_id, date, visitors_a, visitors_b, conversions_a, conversions_b, tests!inner(user_id)')
  .eq('tests.user_id', probeUser)
  .gte('date', statsSince)

// Kontrollfall: Ohne ihn wäre ein "hat funktioniert" nichts wert — eine leere
// Antwort sieht genauso aus wie eine erfolgreiche. Eine erfundene Beziehung
// MUSS PGRST200 liefern, sonst prüft der Check oben gar nichts.
const control = await supabase
  .from('daily_stats')
  .select('test_id, nonexistent_table!inner(user_id)')
  .limit(1)

if (!control.error) {
  bad('Kontrollfall: eine erfundene Beziehung wurde NICHT abgelehnt — der Embedding-Check ist wertlos.')
} else {
  ok(`Kontrollfall greift (${control.error.code ?? 'error'}: kaputtes Embedding wird abgelehnt)`)
}

if (embedded.error) {
  bad(`Embedding tests!inner(user_id) schlägt fehl: ${embedded.error.message}`)
  info('  → Die Zeitraum-KPIs im Dashboard zeigen dann still 0.')
} else {
  ok(`Embedding tests!inner(user_id) funktioniert (${embedded.data.length} Zeilen für einen Account)`)
  const foreign = embedded.data.filter((r) => {
    const t = Array.isArray(r.tests) ? r.tests[0] : r.tests
    return t && t.user_id !== probeUser
  })
  if (foreign.length > 0) bad(`${foreign.length} Zeile(n) fremder Accounts im Ergebnis`)
  else ok('Filter liefert ausschließlich Zeilen des angefragten Accounts')
}

/* ── 2. Hat daily_stats überhaupt Zeilen, und wie frisch sind sie? ── */

const { data: latest, error: latestErr } = await supabase
  .from('daily_stats')
  .select('date')
  .order('date', { ascending: false })
  .limit(1)

if (latestErr) {
  bad(`daily_stats nicht lesbar: ${latestErr.message}`)
} else if (!latest || latest.length === 0) {
  bad('daily_stats ist leer — Trend und Zeitraum-KPIs bleiben für alle leer.')
  info('  → snapshot-stats-Cron prüfen (vercel.json: täglich 0 0 * * *).')
} else {
  const newest = latest[0].date
  const yesterday = dayKey(Date.now() - DAY)
  const ageDays = Math.round((Date.parse(yesterday) - Date.parse(newest)) / DAY)
  if (newest >= yesterday) {
    ok(`daily_stats ist aktuell (jüngste Zeile: ${newest})`)
  } else {
    bad(`daily_stats hinkt hinterher: jüngste Zeile ${newest}, erwartet ${yesterday} (${ageDays} Tage alt)`)
    info('  → Der snapshot-stats-Cron läuft nicht oder bricht ab.')
  }
}

/* ── 3. Invariante aus Migration 039: Deltas summieren sich auf die Zähler ── */

const { data: tests, error: testsErr } = await supabase
  .from('tests')
  .select('id, name, user_id, visitors_a, visitors_b, conversions_a, conversions_b, created_at')
  .in('user_id', userIds)

if (testsErr) {
  bad(`tests-Query fehlgeschlagen: ${testsErr.message}`)
} else {
  const { data: allStats, error: statsErr } = await supabase
    .from('daily_stats')
    .select('test_id, visitors_a, visitors_b, conversions_a, conversions_b')
    .in('test_id', tests.map((t) => t.id))

  if (statsErr) {
    bad(`daily_stats-Query fehlgeschlagen: ${statsErr.message}`)
  } else {
    const sums = new Map()
    for (const r of allStats ?? []) {
      const cur = sums.get(r.test_id) ?? { v: 0, c: 0 }
      cur.v += (r.visitors_a ?? 0) + (r.visitors_b ?? 0)
      cur.c += (r.conversions_a ?? 0) + (r.conversions_b ?? 0)
      sums.set(r.test_id, cur)
    }

    // Der heutige Traffic ist noch in keiner Tageszeile — die Summe darf also
    // kleiner sein als der Zähler, aber niemals größer.
    const over = []
    let withStats = 0
    let totalGap = 0
    for (const t of tests) {
      const s = sums.get(t.id)
      if (!s) continue
      withStats++
      const counter = (t.visitors_a ?? 0) + (t.visitors_b ?? 0)
      if (s.v > counter) over.push({ name: t.name, sum: s.v, counter })
      else totalGap += counter - s.v
    }

    if (withStats === 0) {
      info('Kein Test hat Tageszeilen — Invariante nicht prüfbar.')
    } else if (over.length > 0) {
      bad(`${over.length} Test(s) mit mehr Deltas als Zählerstand — daily_stats doppelt verbucht:`)
      for (const o of over.slice(0, 5)) info(`  ${o.name}: Summe ${o.sum} > Zähler ${o.counter}`)
    } else {
      ok(`Invariante hält für ${withStats} Test(s) (Rückstand gesamt: ${totalGap} Besucher = noch nicht verbuchter Traffic)`)
    }
  }
}

/* ── 4. Scan-Verbrauch: zählt die Anzeige dasselbe wie die Durchsetzung? ── */

const startOfMonth = new Date()
startOfMonth.setDate(1)
startOfMonth.setHours(0, 0, 0, 0)

const { count: scanCount, error: scanErr } = await supabase
  .from('site_insights')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', probeUser)
  .gte('analyzed_at', startOfMonth.toISOString())

if (scanErr) bad(`site_insights-Count fehlgeschlagen: ${scanErr.message}`)
else ok(`Scan-Verbrauch abfragbar (${scanCount ?? 0} diesen Monat für einen Account)`)

console.log(failed === 0 ? '\n✓ Dashboard-Daten: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
