import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { sanitizeHtml } from '@/lib/sanitize'

// Security: UUID v4 Format-Validierung für snippet_key
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const testId = new URL(req.url).searchParams.get('testId') ?? ''
  // Security: UUID-Validierung
  if (!testId || !UUID_RE.test(testId)) {
    return Response.json({ error: 'testId required (UUID)' }, { status: 400, headers: corsHeaders('GET, OPTIONS') })
  }

  const { data, error } = await supabase
    .from('tests')
    .select('variant_b_html')
    .eq('snippet_key', testId)
    .single()

  if (error || !data || !data.variant_b_html) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  // Security: XSS-Sanitization — AI-generiertes HTML vor Auslieferung säubern.
  // Verhindert script-Injection via innerHTML/outerHTML in ab.js.
  return Response.json({ html: sanitizeHtml(data.variant_b_html) }, { headers: corsHeaders('GET, OPTIONS') })
}
