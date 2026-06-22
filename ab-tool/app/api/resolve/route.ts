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
    .select('snippet_key, selector, goal, status, site_url')
    .not('selector', 'is', null)
    .not('status', 'in', ['done','paused'])

  if (error) {
    console.error('[resolve] db error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  const tests = (data ?? [])
    .filter(t => hostOf(t.site_url) === host)
    .filter(t => {
      const tp = pathOf(t.site_url)
      return !tp || path === tp || path.startsWith(tp + '/')
    })
    .map(t => ({ snippet_key: t.snippet_key, selector: t.selector, goal: t.goal, status: t.status }))

  return Response.json({ tests }, { headers: corsHeaders('GET, OPTIONS') })
}
