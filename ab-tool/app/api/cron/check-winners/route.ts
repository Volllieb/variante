import { supabase } from '@/lib/supabase'
import { determineWinner, calcSignificance } from '@/lib/significance'
import { safeError } from '@/lib/safeLog'
import { sendEmail } from '@/lib/email'

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
// Prüft alle aktiven Tests auf neu erkannte Winner und sendet
// E-Mail-Benachrichtigungen via Resend.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
export async function POST(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Alle aktiven Tests ohne Winner laden
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id, name, user_id, site_url, visitors_a, visitors_b, conversions_a, conversions_b, significance, min_visitors, min_uplift, significance_level')
    .in('status', ['active', 'paused'])
    .is('winner', null)

  if (error) {
    safeError('cron:check-winners', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  const notified: string[] = []

  for (const t of tests ?? []) {
    const sig = calcSignificance(t.visitors_a, t.conversions_a, t.visitors_b, t.conversions_b)
    const winner = determineWinner(sig, t.conversions_a, t.conversions_b, t.visitors_a, t.visitors_b, t.min_visitors ?? 100, t.min_uplift ?? 0.05, t.significance_level ?? 0.95)

    if (winner) {
      // Winner persistieren
      await supabase
        .from('tests')
        .update({ winner, significance: sig })
        .eq('id', t.id)

      // Event loggen
      await supabase.rpc('log_event', {
        p_test_id: t.id,
        p_user_id: t.user_id,
        p_type: 'winner_detected',
        p_message: `Winner ${winner} detected (sig=${sig.toFixed(4)}, vA=${t.visitors_a}, vB=${t.visitors_b}, cA=${t.conversions_a}, cB=${t.conversions_b})`,
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
              subject: `🏆 Winner detected: "${t.name}"`,
              html: `
                <p>Your A/B test <strong>"${t.name}"</strong> has a winner!</p>
                <p>Variant <strong>${winner}</strong> won with statistical significance.</p>
                <p>
                  <a href="https://www.getvariante.com/dashboard/results/${t.id}">View results →</a>
                </p>
                <hr>
                <p style="color:#888;font-size:12px">
                  You receive this because notifications are enabled.
                  <a href="https://www.getvariante.com/dashboard">Manage settings</a>
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

  return Response.json({ checked: tests?.length ?? 0, notified })
}

// GET /api/cron/check-winners — Health-Check (kein Cron-Trigger)
export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
