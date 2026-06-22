import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'

export const maxDuration = 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

const MODEL = 'deepseek-chat'

function stripFences(text: string): string {
  let html = text.trim()
  const fence = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  if (fence) html = fence[1].trim()
  return html
}

function buildPrompt(
  originalHtml: string | null,
  siteCss: string | null,
  framework: string | null,
  frameContent: unknown
): string {
  const fw = framework || 'custom'
  const lines: string[] = [
    'Du erstellst Variante B eines Website-Elements für einen A/B-Test.',
    'Ziel: das Figma-Design unten so EXAKT wie möglich als HTML nachbilden.',
    '',
    'Original-HTML (Variante A) — als Gerüst verwenden:',
    originalHtml || '(kein Original-HTML vorhanden)',
    '',
    'Computed Styles + CSS-Regeln des Originals (Referenz für Schrift, transition, :hover):',
    siteCss || '(kein Site-CSS vorhanden)',
    '',
    'Figma-Design (JSON):',
    JSON.stringify(frameContent, null, 2),
    '',
    `Framework: ${fw}`,
    '',
    'REGELN:',
    '- Nur Inline-Styles. Keine neuen Klassen, keine Tailwind-Utilities, kein <style>-Tag.',
    '- Gib NUR das HTML-Fragment zurück, kein DOCTYPE, kein <html>, kein <body>.',
    '- Keine Erklärungen, kein Markdown, keine Code-Fences.',
  ]
  return lines.join('\n')
}

export async function POST(req: Request) {
  let body: { testId?: string; frameContent?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, frameContent } = body
  if (!testId) {
    return Response.json({ error: 'testId fehlt' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data: test, error: fetchErr } = await supabase
    .from('tests')
    .select('original_html, site_css, framework')
    .eq('id', testId)
    .single()

  if (fetchErr || !test) {
    return Response.json({ error: 'Test nicht gefunden' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  const prompt = buildPrompt(test.original_html, test.site_css, test.framework, frameContent)

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'DEEPSEEK_API_KEY fehlt' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  let variantHtml: string
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })
    if (!res.ok) throw new Error(`deepseek ${res.status}`)
    const json = await res.json()
    variantHtml = stripFences(json.choices?.[0]?.message?.content ?? '')
  } catch (e) {
    console.error('[generate] deepseek error:', e)
    return Response.json({ error: 'KI-Fehler' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  }

  const { error: updateErr } = await supabase
    .from('tests')
    .update({ variant_b_html: variantHtml })
    .eq('id', testId)

  if (updateErr) {
    console.error('[generate] update error:', updateErr)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ html: variantHtml }, { headers: corsHeaders('POST, OPTIONS') })
}
