import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { sanitizeHtml, sanitizeCss } from '@/lib/sanitize'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp, loadtestBypass } from '@/lib/rateLimit'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

function hostOf(u: string | null | undefined): string {
  if (!u) return ''
  let s = u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
  s = s.split('/')[0].split('?')[0].split('#')[0]
  return s
}

function pathOf(u: string | null | undefined): string {
  if (!u) return ''
  const s = u.trim().replace(/^https?:\/\//, '')
  const slash = s.indexOf('/')
  if (slash === -1) return ''
  const p = s.slice(slash).split('?')[0].split('#')[0].replace(/\/+$/, '')
  return p === '' ? '' : p
}

export async function GET(req: Request) {
  // Security: Rate-Limiting pro IP.
  // ponytail: Das Limit lag bei 30/min. Resolve feuert bei JEDEM Seitenaufruf,
  // und hinter einem Firmen-NAT oder Mobilfunk-CGNAT teilen sich hunderte
  // Besucher eine IP — die rissen das Limit sofort und sahen dann gar keine
  // Variante mehr (Plan BUG-01b). Eine IP-Bremse ist fuer diesen Endpunkt das
  // falsche Werkzeug; die eigentliche Entlastung ist der Edge-Cache
  // (s-maxage=30, unten). Das Limit bleibt nur als Missbrauchs-Backstop.
  const ip = getClientIp(req)
  if (!loadtestBypass(req) && !await checkRateLimit(`resolve:${ip}`, 600, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: { ...corsHeaders('GET, OPTIONS'), 'Retry-After': '60' } })
  }

  const url = new URL(req.url)
  const host = hostOf(url.searchParams.get('host'))
  // DSGVO: path-Parameter wird ignoriert. Der Client sendet nur noch host,
  // path-Matching passiert clientseitig in ab.js (pathMatches()).
  // Kein Pfad-Tracking auf dem Server.

  if (!host) {
    return Response.json({ tests: [] }, { headers: corsHeaders('GET, OPTIONS') })
  }

  // Host-Filter passiert in der DB (site_host, Migration 021 — generierte Spalte,
  // normalisiert wie hostOf()). Vorher wurden ALLE non-paused Tests geladen und
  // erst in JS gefiltert: ab >200 Tests global fielen Kunden-Tests still aus der
  // Antwort, plus Full-Scan pro Pageview. Das Limit ist jetzt pro Host.
  const { data, error } = await supabase
    .from('tests')
    .select('snippet_key, selector, goal, status, site_url, winner, traffic_split, variant_b_html, variant_b_css, user_id')
    .eq('site_host', host)
    .not('selector', 'is', null)
    .not('status', 'eq', 'paused')
    // Security: NUR Tests mit echtem Besitzer ausliefern (Plan SEC-01, DB-04).
    // Temp-Sessions (/api/temp-session) sind unauthentifiziert erzeugbar und
    // durchlaufen keinen Domain-Gate — ihre Tests sind reine Vorschauen für
    // das Figma-Onboarding und dürfen niemals auf einer echten Website landen.
    // Deckt zugleich verwaiste Rows ab (user_id und temp_session_id beide NULL),
    // die über keine API mehr erreichbar, aber weiterhin auslieferbar wären.
    .not('user_id', 'is', null)
    .limit(200)

  if (error) {
    safeError('resolve', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const matched = (data ?? [])
    // Abgeschlossene Tests nur dann ausliefern, wenn B gewonnen hat (→ erzwungenes B).
    // done+A bleibt draußen, weil das Original ohnehin Variante A ist.
    .filter(t => !(t.status === 'done' && t.winner !== 'B'))
    // Backstop: der Host-Filter läuft bereits in der DB (site_host). Diese Zeile
    // fängt ein Auseinanderlaufen von SQL-Normalisierung und hostOf() ab, damit im
    // Zweifel KEIN fremder Test ausgeliefert wird. Kostet nichts (wenige Zeilen).
    .filter(t => hostOf(t.site_url) === host)
    // DSGVO: Kein server-seitiges Path-Matching mehr. Der Client filtert
    // per pathMatches() — der Server sieht nur die Domain, nicht den Pfad.

  // Badge-Logik: „Powered by Variante" wird angezeigt, wenn der Besitzer eines
  // greifenden Tests NICHT Pro/Agency ist (Free oder Legacy ohne Owner).
  let badge = false
  const ownerIds = Array.from(new Set(matched.map(t => t.user_id).filter(Boolean)))
  if (matched.length) {
    const proOwners = new Set<string>()
    if (ownerIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, plan')
        .in('user_id', ownerIds)
      for (const p of profs ?? []) {
        if (p.plan === 'pro' || p.plan === 'agency') proOwners.add(p.user_id)
      }
    }
    badge = matched.some(t => !t.user_id || !proOwners.has(t.user_id))
  }

  const tests = matched.map(t => ({
    snippet_key: t.snippet_key,
    selector: t.selector,
    goal: t.goal,
    status: t.status,
    traffic_split: t.traffic_split,
    // Security: XSS-Sanitization vor Auslieferung an ab.js.
    // ponytail: variant_b_css ging vorher ROH raus — sanitizeCss existierte,
    // wurde aber nur in lib/previewAnalyze.ts verwendet (Plan SEC-01c).
    variant_b_html: sanitizeHtml(t.variant_b_html),
    variant_b_css: sanitizeCss(t.variant_b_css) || null,
    force: t.status === 'done' && t.winner === 'B' ? 'B' : null,
    // DSGVO: Pfad für clientseitiges Matching (kein Server-Tracking).
    // Extrahiert aus site_url, damit der Client filtern kann, ohne
    // den vollen Pfad zum Server zu senden.
    path: pathOf(t.site_url) || null,
  }))

  return Response.json({ tests, badge }, {
    headers: {
      ...corsHeaders('GET, OPTIONS'),
      // Edge-Cache: Vercel cached die Antwort 30s am Edge. Spart DB-Last
      // bei hochfrequentierten Seiten (jeder Seitenaufruf → resolve-Call).
      // s-maxage=30: Shared-Cache (CDN) 30s, kein Browser-Cache.
      'Cache-Control': 'public, s-maxage=30',
    },
  })
}
