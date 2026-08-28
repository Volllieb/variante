import { supabase } from '@/lib/supabase'
import { calcSignificance, evaluateWinner, hasSampleRatioMismatch } from '@/lib/significance'
import { safeError, safeLog } from '@/lib/safeLog'
import { sendEmail } from '@/lib/email'
import { cronRoute } from '@/lib/cronAuth'
import { formatCount, formatDelta } from '@/lib/formatNumber'

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
// Prüft alle aktiven Tests auf neu erkannte Winner und benachrichtigt via
// Resend + In-App-Notification.
//
// Auto-Promotion (profiles.auto_promote_winner, Default true): Status wird auf
// 'done' gesetzt, done+B → resolve liefert force:'B' (100 % Variant B).
// Ist der Schalter aus, wird der Winner nur protokolliert — der Test bleibt
// 'active', die Kundenseite unverändert, bis der Nutzer manuell zustimmt.

export const { GET, POST } = cronRoute(async (_req) => {

  // Nur AKTIVE Tests ohne Winner laden.
  // ponytail: Vorher wurden auch 'paused' Tests ausgewertet und bei Signifikanz
  // auf status='done' + Auto-Promotion gesetzt. Damit überschrieb der Cron die
  // bewusste Pause des Users — ein pausierter Test wurde über Nacht auf 100 %
  // Variante B ausgerollt, obwohl der User ihn genau deshalb angehalten hatte
  // (z. B. weil die Variante Probleme machte). Pause muss Pause bleiben; ein
  // pausierter Test wird erst wieder ausgewertet, wenn der User ihn reaktiviert.
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id, name, user_id, site_url, created_at, traffic_split, visitors_a, visitors_b, conversions_a, conversions_b, significance, min_visitors, min_uplift, significance_level')
    .eq('status', 'active')
    .is('winner', null)

  if (error) {
    safeError('cron:check-winners', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  const notified: string[] = []
  // Tests, deren Gewinner tatsächlich ausgerollt wurde (Rest: nur gemeldet).
  const promoted: string[] = []

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
    if (!winner) {
      skipped.push({ id: t.id, reason: verdict.reason })

      // ─── Pre-Winner-Warning: Test nähert sich Signifikanz ───
      // Nur warnen wenn der Test schon genug Daten hat (reason ist nicht
      // 'not-enough-visitors' oder 'too-early'), aber noch nicht signifikant ist.
      if (
        sig >= 0.90 &&
        verdict.reason !== 'not-enough-visitors' &&
        verdict.reason !== 'not-enough-conversions' &&
        verdict.reason !== 'too-early'
      ) {
        const crA = t.visitors_a > 0 ? t.conversions_a / t.visitors_a : 0
        const crB = t.visitors_b > 0 ? t.conversions_b / t.visitors_b : 0
        const uplift = crA > 0 ? Math.round(((crB - crA) / crA) * 10000) / 100 : 0
        await supabase.from('notifications').insert({
          user_id: t.user_id,
          type: 'significance',
          title: `"${t.name}" is approaching significance`,
          body: `Your test has reached ${Math.round(sig * 100)}% confidence with ${formatCount(t.visitors_a + t.visitors_b)} visitors. Variant B shows ${formatDelta(uplift)} uplift.`,
          href: `/dashboard/results/${t.id}`,
        })
      }
    }

    if (winner) {
      // ponytail (Plan RA-06): Das Profil entscheidet, ob der Gewinner
      // automatisch ausgerollt wird — deshalb wird es VOR dem Update geladen.
      // Vorher setzte der Cron bedingungslos status='done', was über
      // /api/resolve (force:'B') 100 % Variante B auf der Kundenseite
      // erzwang. Eine fremde Live-Seite dauerhaft zu ändern, ohne dass der
      // Betreiber zugestimmt hat und ohne Abschaltmöglichkeit, ist keine
      // Entscheidung, die ein Cron treffen darf.
      let profile: { notify_on_winner: boolean | null; plan: string | null; auto_promote_winner: boolean | null } | null = null
      if (t.user_id) {
        const { data } = await supabase
          .from('profiles')
          .select('notify_on_winner, plan, auto_promote_winner')
          .eq('user_id', t.user_id)
          .single()
        profile = data
      }
      // Fail-SAFE statt fail-open (Katalog WIN-02, Migration 041): nur ein
      // explizites true rollt aus. NULL, ein fehlendes Profil und ein
      // fehlgeschlagener Select landen jetzt alle auf "nicht ausrollen".
      //
      // Vorher galt `!== false`, also promoten, sobald irgendetwas unklar war.
      // Der Fehlerfall dieser Richtung ist, 100 % Variante B ungefragt auf die
      // Live-Seite eines Kunden zu schalten; der Fehlerfall der anderen Richtung
      // ist ein Test, der auf seinen "Apply winner"-Klick wartet. Nur die zweite
      // Sorte Fehler laesst sich zurueckdrehen.
      const autoPromote = profile?.auto_promote_winner === true

      // Winner immer persistieren (auch ohne Promotion — das verhindert, dass
      // derselbe Test in jedem Lauf erneut gemeldet wird, der Cron filtert auf
      // winner IS NULL). Der Status wechselt nur bei aktiver Auto-Promotion:
      //   done + winner=B → resolve liefert force:'B' (100 % Variante B).
      //   done + winner=A → Test wird nicht mehr ausgeliefert (Original = A).
      // Ohne Promotion bleibt der Test 'active' und läuft mit seinem Split
      // weiter, bis der Nutzer im Dashboard "Apply winner" drückt.
      await supabase
        .from('tests')
        .update({ winner, significance: sig, ...(autoPromote ? { status: 'done' } : {}) })
        .eq('id', t.id)

      // In-App Notification: Winner detected
      const crAWin = t.visitors_a > 0 ? t.conversions_a / t.visitors_a : 0
      const crBWin = t.visitors_b > 0 ? t.conversions_b / t.visitors_b : 0
      const upliftWin = crAWin > 0 ? Math.round(((crBWin - crAWin) / crAWin) * 10000) / 100 : 0
      const statsSuffix = `${(sig * 100).toFixed(1)}% confidence, ${formatDelta(upliftWin)} uplift`
      await supabase.from('notifications').insert(
        autoPromote
          ? {
              user_id: t.user_id,
              type: 'test_done',
              title: `🏆 "${t.name}" — Variant ${winner} won!`,
              body: `Variant ${winner} is now live for all visitors (${statsSuffix}).`,
              href: `/dashboard/results/${t.id}`,
            }
          : {
              user_id: t.user_id,
              // 'significance' rendert als Award-Icon in Amber — "Entscheidung
              // steht an", im Gegensatz zum grünen test_done ("ist live").
              type: 'significance',
              title: `"${t.name}" — Variant ${winner} won. Ready to apply.`,
              body: `Variant ${winner} won (${statsSuffix}). Nothing changed on your site — open the test to apply it or keep running.`,
              href: `/dashboard/results/${t.id}`,
            }
      )

      // Event loggen
      await supabase.rpc('log_event', {
        p_test_id: t.id,
        p_user_id: t.user_id,
        p_type: 'winner_detected',
        p_message: autoPromote
          ? `Winner ${winner} detected — auto-completed. Variant ${winner} now live for all visitors. (sig=${sig.toFixed(4)}, vA=${t.visitors_a}, vB=${t.visitors_b}, cA=${t.conversions_a}, cB=${t.conversions_b})`
          : `Winner ${winner} detected — awaiting manual approval (auto-promotion off). Test stays active, site unchanged. (sig=${sig.toFixed(4)}, vA=${t.visitors_a}, vB=${t.visitors_b}, cA=${t.conversions_a}, cB=${t.conversions_b})`,
      })

      // E-Mail + Pro-Pitch
      if (t.user_id) {
        // E-Mail an User wenn notify_on_winner aktiv
        if (profile?.notify_on_winner !== false) {
          const { data: authUser } = await supabase.auth.admin.getUserById(t.user_id)
          const email = authUser?.user?.email

          if (email) {
            await sendEmail({
              to: email,
              subject: autoPromote
                ? `🏆 "${t.name}" — Variant ${winner} won and is now live`
                : `🏆 "${t.name}" — Variant ${winner} won. Ready to apply.`,
              html: autoPromote
                ? `
                <p>Your A/B test <strong>"${t.name}"</strong> has a winner!</p>
                <p>Variant <strong>${winner}</strong> won with statistical significance (${(sig * 100).toFixed(1)}% confidence)
                   and is <strong>now live for all visitors</strong> automatically.</p>
                <p>
                  <a href="https://www.getvariante.com/dashboard/results/${t.id}">View detailed results →</a>
                </p>
                <hr>
                <p style="color:#888;font-size:12px">
                  Auto-apply is on. You can turn it off under Account → Experiments,
                  and pause or revert the test in your dashboard.
                  <br><a href="https://www.getvariante.com/dashboard/account">Manage settings</a>
                </p>
              `
                : `
                <p>Your A/B test <strong>"${t.name}"</strong> has a winner!</p>
                <p>Variant <strong>${winner}</strong> won with statistical significance (${(sig * 100).toFixed(1)}% confidence).</p>
                <p><strong>Nothing has changed on your site.</strong> Auto-apply is off, so the test keeps
                   running at its current split until you decide.</p>
                <p>
                  <a href="https://www.getvariante.com/dashboard/results/${t.id}">Review and apply the winner →</a>
                </p>
                <hr>
                <p style="color:#888;font-size:12px">
                  You can re-enable auto-apply under Account → Experiments.
                  <br><a href="https://www.getvariante.com/dashboard/account">Manage settings</a>
                </p>
              `,
            })
          }
        }

        // ─── Pro-Pitch für Free-User nach erstem Winner ───
        if (profile?.plan === 'free') {
          await supabase.from('notifications').insert({
            user_id: t.user_id,
            type: 'tip',
            title: 'Your first winner! 🎉',
            body: `${formatDelta(upliftWin)} uplift detected. Pro unlocks unlimited tests — keep optimizing every page.`,
            href: `/dashboard/results/${t.id}`,
          })
        }
      }

      notified.push(t.id)
      if (autoPromote) promoted.push(t.id)

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

  safeLog('info', 'cron:check-winners', 'completed', {
    checked: tests?.length ?? 0,
    notified: notified.length,
    promoted: promoted.length,
    skipped: skipped.length,
  })
  return Response.json({ checked: tests?.length ?? 0, notified, promoted, skipped })
})
