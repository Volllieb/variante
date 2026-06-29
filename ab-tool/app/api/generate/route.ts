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

// CSS-Filterung: Behält nur Regeln, deren Selektoren in original_html vorkommen.
// So bekommt das Modell keine überflüssigen Styles aus dem Seiten-CSS.
function cssFilterRelevant(html: string | null, css: string | null): string {
  if (!html || !css) return css || '(kein Site-CSS vorhanden)'

  const classes = new Set<string>()
  const ids = new Set<string>()
  const tags = new Set<string>()

  let m: RegExpExecArray | null
  const classRe = /class="([^"]+)"/g
  while ((m = classRe.exec(html)) !== null) {
    m[1].split(/\s+/).forEach(c => classes.add(c))
  }
  const idRe = /id="([^"]+)"/g
  while ((m = idRe.exec(html)) !== null) ids.add(m[1])
  const tagRe = /<\s*(\w+)/g
  while ((m = tagRe.exec(html)) !== null) tags.add(m[1].toLowerCase())

  const rules = css.split('}').map(r => r.trim()).filter(Boolean).map(r => {
    const brace = r.indexOf('{')
    if (brace === -1) return null
    const selector = r.slice(0, brace).trim()
    const body = r.slice(brace + 1).trim() + '}'
    const selClasses = [...selector.matchAll(/\.([\w-]+)/g)].map(x => x[1])
    const selIds = [...selector.matchAll(/#([\w-]+)/g)].map(x => x[1])
    const selTags = [...selector.matchAll(/(?:^|[+>~\s,])\s*(\w+)/g)].map(x => x[1].toLowerCase()).filter(Boolean)
    const relevant = selClasses.some(c => classes.has(c)) ||
      selIds.some(id => ids.has(id)) ||
      selTags.some(t => tags.has(t))
    return relevant ? `${selector} {${body}}` : null
  }).filter(Boolean).join('\n')

  return rules || css // Fallback auf komplettes CSS, falls Filter zu aggressiv war
}

// Strukturierter Output per Delimiter: Das Modell wrappt sein HTML zwischen
// <<<VARIANT_HTML>>> und <</VARIANT_HTML>>>. Robuster als Markdown-Code-Fences,
// die das Modell oft vergisst oder falsch formatiert.
const DELIM_START = '<<<VARIANT_HTML>>>'
const DELIM_END = '<</VARIANT_HTML>>>'

function parseStructuredOutput(text: string): string {
  let html = text.trim()
  // Primär: Delimiter-Extraktion
  const start = html.indexOf(DELIM_START)
  const end = html.indexOf(DELIM_END)
  if (start !== -1 && end !== -1 && end > start) {
    return html.slice(start + DELIM_START.length, end).trim()
  }
  // Fallback: Markdown-Fences
  const fence = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()
  return html
}

// Minimales Beispiel (Few-Shot): zeigt dem Modell die erwartete Abbildung von
// Figma-JSON → HTML. Ein Paar reicht, um Output-Format, .ab-v-Scoping und
// Style-Block zu demonstrieren.
const FEW_SHOT_PROMPT = `Beispiel für die erwartete Abbildung:

Figma-JSON:
${JSON.stringify({
    type: 'FRAME', name: 'Button', width: 200, height: 48,
    layoutMode: 'HORIZONTAL', justify: 'CENTER', align: 'CENTER',
    cornerRadius: 8,
    fills: [{ type: 'solid', hex: '#0066FF', opacity: 1 }],
    children: [{
      type: 'TEXT', name: 'Label', text: 'Click me', fontSize: 16,
      fontFamily: 'Inter', textAlign: 'CENTER',
      fills: [{ type: 'solid', hex: '#FFFFFF', opacity: 1 }],
    }],
  }, null, 2)}

Erwartetes HTML:
${DELIM_START}
<div class="ab-v">
  <style>
    .ab-v button {
      display: flex; align-items: center; justify-content: center;
      width: 200px; height: 48px; border: none; border-radius: 8px;
      background: #0066FF; color: #FFFFFF;
      font-family: 'Inter', sans-serif; font-size: 16px;
      cursor: pointer; transition: all .2s ease;
    }
    .ab-v button:hover { background: #0052CC; }
    .ab-v button:focus-visible {
      outline: 3px solid #0066FF88; outline-offset: 2px;
    }
  </style>
  <button>Click me</button>
</div>
${DELIM_END}

Jetzt das echte Figma-Design:`

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
  scope: string,
  userInstructions: string
): string {
  const fw = framework || 'custom'
  const hint = FRAMEWORK_HINTS[fw] ?? FRAMEWORK_HINTS.custom
  const filteredCss = cssFilterRelevant(originalHtml, siteCss)
  return [
    'Du erstellst Variante B eines Website-Elements für einen A/B-Test.',
    'Ziel: das Figma-Design unten so EXAKT wie möglich als HTML nachbilden.',
    '',
    'Original-HTML (Variante A) — als Gerüst verwenden. Die Klassennamen darin',
    'entsprechen den unten gelieferten CSS-Regeln, sodass du genau weißt, wie A aussieht:',
    originalHtml || '(kein Original-HTML vorhanden)',
    '',
    'CSS-Regeln des Originals (gefiltert auf Elemente, die im Original-HTML vorkommen):',
    filteredCss,
    '',
    'Figma-Design (JSON):',
    JSON.stringify(frameContent, null, 2),
    '',
    `Framework: ${fw}`,
    '',
    outputRules(scope),
    hint,
    userInstructions ? `Nutzer-Vorgabe: ${userInstructions}` : '',
    '',
    `WICHTIG - Output-Format: Deine Antwort muss mit ${DELIM_START} beginnen und mit ${DELIM_END} enden.`,
    `Dazwischen steht NUR das HTML-Fragment. Kein Text vor ${DELIM_START} oder nach ${DELIM_END}.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Refine-Prompt: nimmt den vorigen Output + Freitext-Feedback und gibt das
// komplette überarbeitete Fragment zurück.
function buildRefinePrompt(previousHtml: string, feedback: string, scope: string, userInstructions: string): string {
  return [
    'Du verbesserst eine bestehende A/B-Test-Variante (HTML-Fragment).',
    '',
    'Bisheriges HTML:',
    previousHtml,
    '',
    'Änderungswunsch des Nutzers:',
    feedback,
    '',
    userInstructions ? `Zusätzliche Vorgabe: ${userInstructions}` : '',
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
    userInstructions?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, frameContent, feedback, previousHtml } = body
  const scope = body.scope === 'text' || body.scope === 'color' ? body.scope : 'all'
  const userInstructions = body.userInstructions || ''
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
  const isRefinement = !!(feedback && previousHtml)
  const prompt =
    isRefinement
      ? buildRefinePrompt(previousHtml, feedback, scope, userInstructions)
      : FEW_SHOT_PROMPT + '\n\n' + buildPrompt(test.original_html, test.site_css, test.framework, frameContent, scope, userInstructions)

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
    variantHtml = parseStructuredOutput(json.choices?.[0]?.message?.content ?? '')

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

  const response: Record<string, unknown> = { html: variantHtml, siteCss: test.site_css || null }
  if (warnings.length) response.warnings = warnings
  response.filtered_css = isRefinement ? undefined : true // Signal ans Preview: CSS wurde gefiltert
  return Response.json(response, { headers: corsHeaders('POST, OPTIONS') })
}
