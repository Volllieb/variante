import { supabase } from '@/lib/supabase'
import { calcSignificance, evaluateWinner, hasSampleRatioMismatch } from '@/lib/significance'
import { safeError } from '@/lib/safeLog'
import { sendEmail } from '@/lib/email'

// Der erste Lauf nach dem GET-Fix (Plan OPS-01) arbeitet einen aufgestauten
// Bestand ab — E-Mail-Versand pro Test kostet Zeit.
export const maxDuration = 300

// Extrahiert Domain aus einer URL (ohne Protokoll, Pfad, Port).
// "https://www.example.com/page?q=1" → "example.com"
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    return host.replace(/^www\./, '')
  } catch { return null }
}

// POST /api/cron/check-winners — Von Vercel Cron stündlich aufgerufen.
// Prüft alle aktiven Tests auf neu erkannte Winner, setzt den Status
// automatisch auf 'done' (Auto-Promotion) und sendet E-Mail-Benachrichtigungen
// via Resend. done+B → resolve liefert force:'B' (100% Variant B).
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
async function run(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Alle aktiven Tests ohne Winner laden
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id, name, user_id, site_url, created_at, traffic_split, visitors_a, visitors_b, conversions_a, conversions_b, significance, min_visitors, min_uplift, significance_level')
    .in('status', ['active', 'paused'])
    .is('winner', null)

  if (error) {
    safeError('cron:check-winners', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  const notified: string[] = []

  // ponytail: Die Gewinner-Entscheidung fällt AUSSCHLIESSLICH hier — einmal pro
  // Tag. Vorher wurde sie zusätzlich in /api/event bei jeder Conversion neu
  // getroffen, also potenziell tausendfach am selben Datensatz (Plan STAT-01).
  const skipped: { id: string; reason: string }[] = []

  for (const t of tests ?? []) {
    const sig = calcSignificance(t.visitors_a, t.conversions_a, t.visitors_b, t.conversions_b)

    // Sample Ratio Mismatch: weicht die Traffic-Verteilung stark von der
    // konfigurierten ab, ist die Datenbasis kaputt — dann darf kein Gewinner
    // deklariert werden, egal wie gut die Zahlen aussehen.
    if (hasSampleRatioMismatch(t.visitors_a, t.visitors_b, t.traffic_split ?? 50)) {
      skipped.push({ id: t.id, reason: 'sample-ratio-mismatch' })
      await supabase.rpc('log_event', {
        p_test_id: t.id,
        p_user_id: t.user_id,
        p_type: 'health',
        p_message: `Sample ratio mismatch (A=${t.visitors_a}, B=${t.visitors_b}, split=${t.traffic_split ?? 50}%). Ergebnisse sind nicht belastbar.`,
      })
      continue
    }

    const verdict = evaluateWinner({
      significance: sig,
      cA: t.conversions_a,
      cB: t.conversions_b,
      vA: t.visitors_a,
      vB: t.visitors_b,
      createdAt: t.created_at,
      minVisitorsPerArm: t.min_visitors ?? undefined,
      minUplift: t.min_uplift ?? 0.05,
      significanceLevel: t.significance_level ?? 0.95,
    })
    const winner = verdict.winner
    if (!winner) skipped.push({ id: t.id, reason: verdict.reason })

    if (winner) {
      // Winner persistieren + Auto-Promotion: Status auf 'done' setzen.
      // done + winner=B → resolve liefert force:'B' (100% Variant B).
      // done + winner=A → Test wird nicht mehr ausgeliefert (Original = A).
      await supabase
        .from('tests')
        .update({ winner, significance: sig, status: 'done' })
        .eq('id', t.id)

      // Event loggen
      await supabase.rpc('log_event', {
        p_test_id: t.id,
        p_user_id: t.user_id,
        p_type: 'winner_detected',
        p_message: `Winner ${winner} detected — auto-completed. Variant ${winner} now live for all visitors. (sig=${sig.toFixed(4)}, vA=${t.visitors_a}, vB=${t.visitors_b}, cA=${t.conversions_a}, cB=${t.conversions_b})`,
      })

      // E-Mail an User wenn notify_on_winner aktiv
      if (t.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('notify_on_winner')
          .eq('user_id', t.user_id)
          .single()

        if (profile?.notify_on_winner !== false) {
          const { data: authUser } = await supabase.auth.admin.getUserById(t.user_id)
          const email = authUser?.user?.email

          if (email) {
            await sendEmail({
              to: email,
              subject: `🏆 "${t.name}" — Variant ${winner} won and is now live`,
              html: `
                <p>Your A/B test <strong>"${t.name}"</strong> has a winner!</p>
                <p>Variant <strong>${winner}</strong> won with statistical significance (${(sig * 100).toFixed(1)}% confidence)
                   and is <strong>now live for all visitors</strong> automatically.</p>
                <p>
                  <a href="https://www.getvariante.com/dashboard/results/${t.id}">View detailed results →</a>
                </p>
                <hr>
                <p style="color:#888;font-size:12px">
                  Auto-promotion is on by default. You can pause or revert the test in your dashboard.
                  <br><a href="https://www.getvariante.com/dashboard">Manage settings</a>
                </p>
              `,
            })
          }
        }
      }

      notified.push(t.id)

      // ─── Learning Loop v3: Winner-Daten in site_insights schreiben ───
      const domain = extractDomain(t.site_url)
      if (domain) {
        try {
          const { data: insights } = await supabase
            .from('site_insights')
            .select('id, test_results_json')
            .eq('user_id', t.user_id)
            .eq('domain', domain)
            .order('analyzed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (insights) {
            const crA = t.visitors_a > 0 ? t.conversions_a / t.visitors_a : 0
            const crB = t.visitors_b > 0 ? t.conversions_b / t.visitors_b : 0
            const uplift = crA > 0 ? Math.round(((crB - crA) / crA) * 10000) / 100 : 0
            const resultEntry = {
              test_id: t.id,
              test_name: t.name,
              winner,
              uplift,
              significance: Math.round(sig * 10000) / 10000,
              detected_at: new Date().toISOString(),
            }
            const existing = (insights.test_results_json as Record<string, unknown>[]) ?? []
            await supabase.from('site_insights')
              .update({ test_results_json: [...existing, resultEntry] })
              .eq('id', insights.id)
          }
        } catch (err) {
          safeError('cron:learning-loop-write', err)
        }
      }
    }
  }

  return Response.json({ checked: tests?.length ?? 0, notified, skipped })
}

// Vercel Cron ruft den Pfad per GET auf — die Methode ist in vercel.json
// nicht konfigurierbar. Vorher lag die Arbeit ausschliesslich in POST und
// GET gab nur einen Hinweistext zurueck: KEIN Cron-Job lief jemals
// (Plan OPS-01). Der Authorization: Bearer $CRON_SECRET wird von Vercel
// automatisch mitgeschickt.
export const GET = run
export const POST = run
