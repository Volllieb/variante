import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { calcSignificance } from '@/lib/significance'
import { checkRateLimit, getClientIp, loadtestBypass, markConversionOnce } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'
import { verifyAssignToken, TOKEN_TTL_SECONDS } from '@/lib/assignToken'
import { parseBody } from '@/lib/apiHelpers'
import { eventBody } from '@/lib/validation'

// Plan DATA-01: Verifiziere das signierte Token aus /api/assign.
// Verhindert, dass Conversions ohne vorherige Zuweisung gefälscht werden können.
// Ausstellung + Prüfung + Secret leben zentral in lib/assignToken.ts.

export async function OPTIONS() {
  return preflightPublic('POST, OPTIONS')
}

// Rückgabe der RPC ab_convert. Die Winner-Schwellen (min_visitors,
// min_uplift, significance_level) werden hier nicht mehr gebraucht — die
// Entscheidung fällt im Tages-Cron (Plan STAT-01).
type TestRow = {
  id: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
}

export async function POST(req: Request) {
  // Security: Rate-Limiting pro IP. Wie bei /api/resolve war 30/min zu eng
  // fuer geteilte IPs (Plan BUG-01b). Conversions sind zusaetzlich pro Session
  // dedupliziert (ab.js sendConversion), das Limit ist reiner Missbrauchsschutz.
  const ip = getClientIp(req)
  if (!loadtestBypass(req) && !await checkRateLimit(`event:${ip}`, 300, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: corsHeadersPublic('POST, OPTIONS') })
  }

  const parsed = await parseBody(req, eventBody, 'POST, OPTIONS')
  if (!parsed.ok) {
    const err = parsed.response
    return Response.json(
      await err.json(),
      { status: err.status, headers: corsHeadersPublic('POST, OPTIONS') }
    )
  }
  const { testId, variant, token } = parsed.data

  // Plan DATA-01: Token verifizieren. Fehlt es, akzeptieren wir die Conversion
  // (Graceful Degradation): Im cookieless Default-Modus von ab.js überlebt das
  // Token keinen Seitenwechsel, Cross-Page-Conversions kommen dann legitim ohne
  // Token. Ist ein Token da, MUSS es gültig sein — ein ungültiges/abgelaufenes
  // wird abgelehnt. Eine bereits eingelöste Nonce ist ein Replay und wird
  // verworfen, ohne die Conversion erneut zu zählen.
  if (!token) {
    console.warn('[event] conversion without token — cookieless page-change or outdated ab.js')
  } else {
    const check = verifyAssignToken(testId, variant, token)
    if (!check.valid) {
      return Response.json(
        { error: 'invalid or expired token' },
        { status: 403, headers: corsHeadersPublic('POST, OPTIONS') }
      )
    }
    if (check.nonce) {
      const first = await markConversionOnce(check.nonce, TOKEN_TTL_SECONDS)
      if (!first) {
        // Replay derselben Zuweisung — als OK bestätigen, aber nicht doppelt zählen.
        return Response.json({ ok: true, deduped: true }, { headers: corsHeadersPublic('POST, OPTIONS') })
      }
    }
  }

  try {
    // Guard: Conversions auf pausierten ODER abgeschlossenen Tests nicht zählen.
    // (done kann über alte localStorage-Caches noch Klicks senden.)
    const { data: testMeta, error: metaError } = await supabase
      .from('tests')
      .select('status')
      .eq('snippet_key', testId)
      .maybeSingle()

    if (metaError || !testMeta) {
      return Response.json({ error: 'not found' }, { status: 404, headers: corsHeadersPublic('POST, OPTIONS') })
    }

    if (testMeta.status === 'paused' || testMeta.status === 'done') {
      return Response.json({ error: 'test is not active' }, { status: 409, headers: corsHeadersPublic('POST, OPTIONS') })
    }

    const { data, error } = await supabase.rpc('ab_convert', { p_key: testId, p_variant: variant })

    if (error) {
      safeError('event', error)
      return Response.json({ error: 'db error' }, { status: 500, headers: corsHeadersPublic('POST, OPTIONS') })
    }

    const row = data as TestRow | null
    if (!row || !row.id) {
      return Response.json({ error: 'not found' }, { status: 404, headers: corsHeadersPublic('POST, OPTIONS') })
    }

    // Signifikanz mitschreiben, damit das Dashboard einen aktuellen Wert zeigt.
    //
    // ponytail: Hier stand vorher ZUSÄTZLICH determineWinner() plus
    // `status: winner ? 'done' : undefined`. Damit wurde bei JEDER Conversion neu
    // getestet und der Test bei Erfolg sofort beendet — klassisches Peeking, das
    // die reale Falsch-Positiv-Rate weit über die beworbenen 5 % treibt
    // (Plan STAT-01). Die Gewinner-Entscheidung liegt jetzt ausschließlich im
    // Tages-Cron /api/cron/check-winners, wo sie einmal pro Tag und mit
    // Mindestlaufzeit-, Stichproben- und Conversion-Schwellen fällt.
    const significance = calcSignificance(
      row.visitors_a,
      row.conversions_a,
      row.visitors_b,
      row.conversions_b
    )

    const { error: updateError } = await supabase
      .from('tests')
      .update({ significance })
      .eq('id', row.id)

    if (updateError) {
      safeError('event', updateError)
    }

    return Response.json({ ok: true }, { headers: corsHeadersPublic('POST, OPTIONS') })
  } catch (err) {
    safeError('event', err instanceof Error ? err : new Error(String(err)))
    return Response.json({ error: 'service unavailable' }, { status: 503, headers: corsHeadersPublic('POST, OPTIONS') })
  }
}
