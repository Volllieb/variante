import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'
import { sendEmail } from '@/lib/email'

// POST /api/cron/weekly-digest — Wöchentliche Zusammenfassung für alle User mit aktiven Tests.
// Von Vercel Cron montags 9:00 UTC aufgerufen.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
export async function POST(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Alle User mit aktiven Tests + deren Profile (Email, Digest-Präferenz)
  const { data: activeTestOwners, error } = await supabase
    .from('tests')
    .select('user_id')
    .in('status', ['active', 'paused'])
    .not('user_id', 'is', null)

  if (error) {
    safeError('cron:weekly-digest:query', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  // Dedup user_ids
  const uniqueUserIds = [...new Set((activeTestOwners ?? []).map((t) => t.user_id))]
  let sent = 0
  let skipped = 0

  for (const userId of uniqueUserIds) {
    // Profile & Auth-Email laden
    const [{ data: profile }, { data: authUser }] = await Promise.all([
      supabase
        .from('profiles')
        .select('notify_on_weekly_digest, last_digest_sent_at')
        .eq('user_id', userId)
        .single(),
      supabase.auth.admin.getUserById(userId),
    ])

    const email = authUser?.user?.email
    if (!email || profile?.notify_on_weekly_digest === false) {
      skipped++
      continue
    }

    // Tests dieses Users laden
    const { data: userTests } = await supabase
      .from('tests')
      .select('id, name, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const tests = userTests ?? []
    const activeTests = tests.filter((t) => t.status === 'active' || t.status === 'paused')
    const completedTests = tests.filter((t) => t.status === 'done' || t.winner)

    if (activeTests.length === 0) {
      skipped++
      continue
    }

    // Digest-HTML bauen
    const totalVisitors = activeTests.reduce((sum, t) => sum + t.visitors_a + t.visitors_b, 0)
    const totalConversions = activeTests.reduce((sum, t) => sum + t.conversions_a + t.conversions_b, 0)
    const hasWinners = completedTests.length > 0

    const testRows = activeTests
      .map((t) => {
        const visitors = t.visitors_a + t.visitors_b
        const conversions = t.conversions_a + t.conversions_b
        const cr = visitors > 0 ? ((conversions / visitors) * 100).toFixed(1) : '0.0'
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a">
              <a href="https://www.getvariante.com/dashboard/results/${t.id}" style="color:#fff;text-decoration:none">${t.name}</a>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#888">${visitors.toLocaleString()}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#888">${conversions.toLocaleString()}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#2fd76c">${cr}%</td>
          </tr>`
      })
      .join('')

    const winnerSection = hasWinners
      ? `
        <h3 style="color:#2fd76c;margin-top:24px">🏆 Completed tests</h3>
        <p>${completedTests.map((t) => `"${t.name}" → Variant <strong>${t.winner}</strong>`).join('<br>')}</p>`
      : `
        <p style="color:#888;margin-top:24px">No winners yet — let your tests run!</p>`

    const html = `
      <div style="background:#0a0a0a;color:#ededed;padding:32px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;border-radius:12px;border:1px solid #1a1a1a">
        <h1 style="font-size:20px;margin:0 0 8px">📊 Your weekly variante digest</h1>
        <p style="color:#888;margin:0 0 24px">Here's how your tests performed this week.</p>

        <div style="display:flex;gap:24px;margin-bottom:24px">
          <div>
            <p style="font-size:24px;font-weight:700;margin:0;color:#f5a623">${activeTests.length}</p>
            <p style="font-size:12px;margin:4px 0 0;color:#888">Active tests</p>
          </div>
          <div>
            <p style="font-size:24px;font-weight:700;margin:0">${totalVisitors.toLocaleString()}</p>
            <p style="font-size:12px;margin:4px 0 0;color:#888">Visitors</p>
          </div>
          <div>
            <p style="font-size:24px;font-weight:700;margin:0">${totalConversions.toLocaleString()}</p>
            <p style="font-size:12px;margin:4px 0 0;color:#888">Conversions</p>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="text-align:left;color:#888">
              <th style="padding:8px 12px">Test</th>
              <th style="padding:8px 12px">Visitors</th>
              <th style="padding:8px 12px">Conv.</th>
              <th style="padding:8px 12px">CR</th>
            </tr>
          </thead>
          <tbody>${testRows}</tbody>
        </table>

        ${winnerSection}

        <div style="margin-top:32px">
          <a href="https://www.getvariante.com/dashboard" style="display:inline-block;background:#fff;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">Open dashboard →</a>
        </div>

        <hr style="border:none;border-top:1px solid #1a1a1a;margin:24px 0">
        <p style="color:#555;font-size:11px">
          You receive this weekly digest because you have active tests on variante.
          <a href="https://www.getvariante.com/dashboard/account" style="color:#888">Unsubscribe</a>
        </p>
      </div>`

    await sendEmail({
      to: email,
      subject: `📊 Your variante digest — ${activeTests.length} active test${activeTests.length > 1 ? 's' : ''}, ${totalVisitors.toLocaleString()} visitors`,
      html,
    })

    // Timestamp setzen
    await supabase
      .from('profiles')
      .update({ last_digest_sent_at: new Date().toISOString() })
      .eq('user_id', userId)

    sent++
  }

  return Response.json({ sent, skipped, total: uniqueUserIds.length })
}

// GET /api/cron/weekly-digest — Health-Check
export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
