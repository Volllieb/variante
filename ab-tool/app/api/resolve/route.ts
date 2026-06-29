import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'

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
  const url = new URL(req.url)
  const host = hostOf(url.searchParams.get('host'))
  const path = (url.searchParams.get('path') || '').split('?')[0].split('#')[0].replace(/\/+$/, '')

  if (!host) {
    return Response.json({ tests: [] }, { headers: corsHeaders('GET, OPTIONS') })
  }

  const { data, error } = await supabase
    .from('tests')
    .select('snippet_key, selector, goal, status, site_url, winner, traffic_split, variant_b_html, user_id')
    .not('selector', 'is', null)
    .not('status', 'eq', 'paused')
    .limit(200) // ponytail: vernünftiges Limit statt ALLER non-paused Tests

  if (error) {
    console.error('[resolve] db error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const matched = (data ?? [])
    // Abgeschlossene Tests nur dann ausliefern, wenn B gewonnen hat (→ erzwungenes B).
    // done+A bleibt draußen, weil das Original ohnehin Variante A ist.
    .filter(t => !(t.status === 'done' && t.winner !== 'B'))
    .filter(t => hostOf(t.site_url) === host)
    .filter(t => {
      const tp = pathOf(t.site_url)
      return !tp || path === tp || path.startsWith(tp + '/')
    })

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
    variant_b_html: t.variant_b_html,
    force: t.status === 'done' && t.winner === 'B' ? 'B' : null,
  }))

  return Response.json({ tests, badge }, { headers: corsHeaders('GET, OPTIONS') })
}
