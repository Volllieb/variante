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

const SCOPE_RULE: Record<string, string> = {
  text: '- SCOPE: NUR Textinhalte ändern. Layout, Farben, Größen, Struktur exakt wie im Original belassen.',
  color: '- SCOPE: NUR Farben/Hintergründe/Hover-Farben ändern. Text und Struktur unverändert lassen.',
  all: '',
}

// Gemeinsame Ausgabe-Regeln. Erlaubt EINEN gescopten <style>-Block, weil ein
// inline style-Attribut kein :hover/:focus/transition ausdrücken kann. Der
// Block wird über die Wrapper-Klasse .ab-v gescopt, damit nichts auf die
// restliche Kundenseite leckt; .ab-v ist zugleich ein stabiler Conversion-Selektor.
function outputRules(scope: string): string {
  const lines = [
    'REGELN:',
    '- Wickle das Element in EINEN Container mit der Klasse "ab-v" (z. B. <div class="ab-v">…</div>).',
    '- Gib GENAU EINEN <style>-Block aus, dessen Selektoren ALLE mit ".ab-v" beginnen.',
    '  Niemals globale Selektoren wie "button{}" oder ":root".',
    '- Pflicht: klickbare Elemente (Button/Link) brauchen .ab-v …:hover UND .ab-v …:focus-visible',
    '  mit sichtbarem Feedback, plus "transition: all .2s ease" im Grundzustand.',
    '- Nutze die :hover/transition-Werte aus dem Site-CSS als Referenz, damit das Hover-Feedback zum Look der Seite passt.',
    '- Alles Übrige als Inline-Styles. Keine Tailwind-Utilities.',
    '- Gib NUR das HTML-Fragment zurück, kein DOCTYPE, kein <html>, kein <body>.',
    '- Keine Erklärungen, kein Markdown, keine Code-Fences.',
  ]
  if (SCOPE_RULE[scope]) lines.push(SCOPE_RULE[scope])
  return lines.join('\n')
}

function buildPrompt(
  originalHtml: string | null,
  siteCss: string | null,
  framework: string | null,
  frameContent: unknown,
  scope: string
): string {
  const fw = framework || 'custom'
  return [
    'Du erstellst Variante B eines Website-Elements für einen A/B-Test.',
    'Ziel: das Figma-Design unten so EXAKT wie möglich als HTML nachbilden.',
    '',
    'Original-HTML (Variante A) — als Gerüst verwenden. Die Klassennamen darin',
    'entsprechen den unten gelieferten CSS-Regeln, sodass du genau weißt, wie A aussieht:',
    originalHtml || '(kein Original-HTML vorhanden)',
    '',
    'Computed Styles + CSS-Regeln des Originals (Referenz für Look: Schrift, Cover/object-fit,',
    'background-size, transition, transform, animation, Layout, :hover):',
    siteCss || '(kein Site-CSS vorhanden)',
    '',
    'Figma-Design (JSON):',
    JSON.stringify(frameContent, null, 2),
    '',
    `Framework: ${fw}`,
    '',
    outputRules(scope),
  ].join('\n')
}

// Refine-Prompt: nimmt den vorigen Output + Freitext-Feedback und gibt das
// komplette überarbeitete Fragment zurück.
function buildRefinePrompt(previousHtml: string, feedback: string, scope: string): string {
  return [
    'Du verbesserst eine bestehende A/B-Test-Variante (HTML-Fragment).',
    '',
    'Bisheriges HTML:',
    previousHtml,
    '',
    'Änderungswunsch des Nutzers:',
    feedback,
    '',
    'Gib das KOMPLETTE überarbeitete Fragment zurück — selbe Regeln wie zuvor:',
    outputRules(scope),
  ].join('\n')
}

export async function POST(req: Request) {
  let body: {
    testId?: string
    frameContent?: unknown
    feedback?: string
    previousHtml?: string
    scope?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, frameContent, feedback, previousHtml } = body
  const scope = body.scope === 'text' || body.scope === 'color' ? body.scope : 'all'
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

  // Mit Feedback + vorigem Output → Verfeinerung, sonst Erstgenerierung.
  const prompt =
    feedback && previousHtml
      ? buildRefinePrompt(previousHtml, feedback, scope)
      : buildPrompt(test.original_html, test.site_css, test.framework, frameContent, scope)

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
