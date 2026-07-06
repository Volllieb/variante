import { supabase } from '@/lib/supabase'
import { determineWinner, calcSignificance } from '@/lib/significance'
import { safeError } from '@/lib/safeLog'

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

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM || 'notifications@getvariante.com'

  // Alle aktiven Tests ohne Winner laden
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id, name, user_id, visitors_a, visitors_b, conversions_a, conversions_b, significance, min_visitors, min_uplift')
    .in('status', ['active', 'paused'])
    .is('winner', null)

  if (error) {
    safeError('cron:check-winners', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  const notified: string[] = []

  for (const t of tests ?? []) {
    const sig = calcSignificance(t.visitors_a, t.conversions_a, t.visitors_b, t.conversions_b)
    const winner = determineWinner(sig, t.conversions_a, t.conversions_b, t.visitors_a, t.visitors_b, t.min_visitors ?? 100, t.min_uplift ?? 0.05)

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
      if (resendKey && t.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('notify_on_winner')
          .eq('user_id', t.user_id)
          .single()

        if (profile?.notify_on_winner !== false) {
          // E-Mail-Adresse aus auth.users holen
          const { data: authUser } = await supabase.auth.admin.getUserById(t.user_id)
          const email = authUser?.user?.email

          if (email) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `variante <${fromEmail}>`,
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
                }),
              })
            } catch {
              // E-Mail-Versand fehlgeschlagen — nicht blockierend
              safeError('cron:email', { message: `failed to send winner email for test ${t.id}` })
            }
          }
        }
      }

      notified.push(t.id)
    }
  }

  return Response.json({ checked: tests?.length ?? 0, notified })
}

// GET /api/cron/check-winners — Health-Check (kein Cron-Trigger)
export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
