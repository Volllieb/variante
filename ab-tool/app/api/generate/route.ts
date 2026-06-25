import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'

export const maxDuration = 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

const MODEL = 'deepseek-chat'

// Stabiler System-Prompt: rollt die Role aus, ohne dass das Modell raten muss.
const SYSTEM_PROMPT =
  'Du bist ein spezialisierter HTML/CSS-Generierungs-Assistent für A/B-Tests. ' +
  'Deine Aufgabe ist es, ein Figma-Design präzise als valides HTML-Fragment umzusetzen, ' +
  'das isoliert in eine beliebige Website eingebunden werden kann. ' +
  'Prinzipien: (1) Isolation – dein Code darf nie mit der umgebenden Seite interferieren ' +
  '(deshalb .ab-v-Scoping). (2) Barrierefreiheit – :focus-visible auf interaktiven Elementen. ' +
  '(3) Visuelle Treue – das Ergebnis muss dem Figma-Design so nah wie möglich kommen. ' +
  '(4) Keine Annahmen – wenn das Figma-JSON eine Eigenschaft nicht explizit angibt, ' +
  'orientiere dich am Original-HTML und Site-CSS.'

// Framework-Hinweise: jedes Framework bekommt spezifische Regeln, damit der Output
// im Ziel-Kontext funktioniert. Custom = kein Extra-Hinweis.
const FRAMEWORK_HINTS: Record<string, string> = {
  react:
    'React/JSX-Umgebung: Verwende className statt class. Keine JSX-spezifischen Attribute ' +
    '(htmlFor, dangerouslySetInnerHTML, etc.) – wir brauchen rohes HTML, das per innerHTML gesetzt wird.',
  next:
    'Next.js/React-Umgebung: className statt class. Keine Next-Komponenten (Image, Link). ' +
    'Reines HTML-Fragment wie für innerHTML.',
  vue:
    'Vue-Umgebung: class (nicht className). Keine Vue-Template-Syntax (v-for, v-if, @click). ' +
    'Reines HTML-Fragment.',
  custom: '',
}

function stripFences(text: string): string {
  let html = text.trim()
  const fence = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  if (fence) html = fence[1].trim()
  return html
}

// Minimale Output-Validierung: fängt offensichtlich kaputte Generationen, bevor sie
// in die DB geschrieben oder ans Preview gesendet werden. Keine vollständige HTML-
// Validierung – nur die Regeln, die der Prompt vorgibt und die maschinell prüfbar sind.
function validateOutput(html: string): { valid: boolean; warnings: string[] } {
  const w: string[] = []
  if (!html) w.push('Leeres HTML-Fragment')
  if (!/class="ab-v/.test(html) && !/class='ab-v/.test(html)) w.push('Fehlender .ab-v-Container')
  if (!html.includes('<style>')) w.push('Fehlender <style>-Block (hover/focus braucht einen)')
  if (/<\/?html/i.test(html)) w.push('Enthält <html>-Tag – entfernen')
  if (/```/.test(html)) w.push('Enthält Markdown-Code-Fences – stripFences hat nicht gegriffen')
  if (/<\/?body/i.test(html)) w.push('Enthält <body>-Tag – entfernen')
  return { valid: w.length === 0, warnings: w }
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
  const hint = FRAMEWORK_HINTS[fw] ?? FRAMEWORK_HINTS.custom
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
    hint,
  ]
    .filter(Boolean)
    .join('\n')
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
    return Response.json({ error: 'testId required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  const { data: test, error: fetchErr } = await supabase
    .from('tests')
    .select('original_html, site_css, framework')
    .eq('id', testId)
    .eq('user_id', user.userId)
    .single()

  if (fetchErr || !test) {
    return Response.json({ error: 'test not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Mit Feedback + vorigem Output → Verfeinerung, sonst Erstgenerierung.
  const prompt =
    feedback && previousHtml
      ? buildRefinePrompt(previousHtml, feedback, scope)
      : buildPrompt(test.original_html, test.site_css, test.framework, frameContent, scope)

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'DEEPSEEK_API_KEY missing' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // Dynamische Temperatur: Text braucht etwas Kreativität für natürliche
  // Variationen, Layout/Farbe braucht deterministische Treue.
  const temperature = scope === 'text' ? 0.6 : 0.3

  let variantHtml: string
  let warnings: string[] = []
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature,
      }),
    })
    if (!res.ok) throw new Error(`deepseek ${res.status}`)
    const json = await res.json()
    variantHtml = stripFences(json.choices?.[0]?.message?.content ?? '')

    // Output validieren – Warnungen loggen, aber nur bei Totalausfall abbrechen.
    const check = validateOutput(variantHtml)
    warnings = check.warnings
    if (!variantHtml) throw new Error('empty response after stripFences')
  } catch (e) {
    console.error('[generate] deepseek error:', e)
    return Response.json({ error: 'AI generation failed' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  }

  if (warnings.length) {
    console.warn('[generate] validation warnings:', warnings)
  }

  const { error: updateErr } = await supabase
    .from('tests')
    .update({ variant_b_html: variantHtml })
    .eq('id', testId)
    .eq('user_id', user.userId)

  if (updateErr) {
    console.error('[generate] update error:', updateErr)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ html: variantHtml, warnings: warnings.length ? warnings : undefined }, { headers: corsHeaders('POST, OPTIONS') })
}
