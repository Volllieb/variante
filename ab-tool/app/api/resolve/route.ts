import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { sanitizeHtml } from '@/lib/sanitize'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

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
  let s = u.trim().replace(/^https?:\/\//, '')
  const slash = s.indexOf('/')
  if (slash === -1) return ''
  let p = s.slice(slash).split('?')[0].split('#')[0].replace(/\/+$/, '')
  return p === '' ? '' : p
}

export async function GET(req: Request) {
  // Security: Rate-Limiting — maximal 30 Resolve-Calls pro Minute pro IP.
  // Resolve wird bei jedem Seitenaufruf von ab.js aufgerufen, daher das
  // gleiche Limit wie /api/event (das ebenfalls pro Seitenaufruf feuert).
  const ip = getClientIp(req)
  if (!await checkRateLimit(`resolve:${ip}`, 30, 60_000)) {
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

  const { data, error } = await supabase
    .from('tests')
    .select('snippet_key, selector, goal, status, site_url, winner, traffic_split, variant_b_html, variant_b_css, user_id')
    .not('selector', 'is', null)
    .not('status', 'eq', 'paused')
    .limit(200) // ponytail: vernünftiges Limit statt ALLER non-paused Tests

  if (error) {
    safeError('resolve', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const matched = (data ?? [])
    // Abgeschlossene Tests nur dann ausliefern, wenn B gewonnen hat (→ erzwungenes B).
    // done+A bleibt draußen, weil das Original ohnehin Variante A ist.
    .filter(t => !(t.status === 'done' && t.winner !== 'B'))
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
    // Security: XSS-Sanitization vor Auslieferung an ab.js
    variant_b_html: sanitizeHtml(t.variant_b_html),
    variant_b_css: t.variant_b_css || null,
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
