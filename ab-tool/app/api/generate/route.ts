import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { scanPII, PII_PATTERNS } from '@/lib/pii'
import { getAIMonthlyBudget } from '@/lib/planLimits'

export const maxDuration = 60

// Geschätzte Kosten pro Generation (gpt-4o-mini): ~$0.15/1M Input + ~$0.60/1M Output.
// Bei max_tokens=4096 ist der Worst-Case-Output ~$0.0025. Inklusive Input-Prompt
// (Figma-JSON + CSS + System-Prompt) runden wir auf $0.005 pro Call — bewusst
// überschätzt, damit das Limit nie unterschritten wird.
const ESTIMATED_COST_PER_GEN = 0.005
// ponytail: Vorher galt dieses eine Limit fuer ALLE Plaene — ein Free-User
// bekam hier $20 statt der in planLimits.ts dokumentierten $5, waehrend
// /api/agent korrekt nach Plan unterschied. Jetzt eine Quelle: planLimits.ts.
const TEMP_SESSION_GEN_LIMIT = 3

// =============================================================================
// PII-Scanner: importiert aus lib/pii.ts (DSGVO/GDPR).
// =============================================================================

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

const MODEL = 'gpt-4o-mini'

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

// System-Prompt für Reorder-Tests: erzeugt reines CSS, kein HTML.
const REORDER_SYSTEM_PROMPT =
  'Du bist ein CSS-Spezialist für Layout-A/B-Tests. ' +
  'Deine Aufgabe: zwei HTML-Elemente visuell tauschen — NUR mit CSS. ' +
  'WICHTIG: Du darfst NUR CSS ausgeben. Kein HTML, keine Erklärungen. ' +
  'Verwende flexbox order, flex-direction (row-reverse, column-reverse) oder CSS Grid order. ' +
  'Alle Selektoren MÜSSEN mit der DOM-Struktur der Seite funktionieren — du bekommst ' +
  'die exakten CSS-Selektoren beider Elemente. ' +
  'Setze KEINE Annahmen über Eltern-Container voraus — verwende nur die Selektoren, die du bekommst. ' +
  'Füge kurze CSS-Kommentare hinzu, die erklären, was getauscht wird.'

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

// CSS-Regeln parsen mit Brace-Tiefen-Tracking (kein naiver Split an '}' —
// bricht bei content: "}" oder data:image/svg-URLs mit geschweiften Klammern).
function splitRules(css: string): string[] {
  const rules: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        rules.push(css.slice(start, i + 1))
        start = i + 1
      }
    }
  }
  return rules
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

  const rules = splitRules(css).map(r => {
    const brace = r.indexOf('{')
    if (brace === -1) return null
    const selector = r.slice(0, brace).trim()
    const body = r.slice(brace + 1, -1).trim() // -1 entfernt die schließende }
    const selClasses = [...selector.matchAll(/\.([\w-]+)/g)].map(x => x[1])
    const selIds = [...selector.matchAll(/#([\w-]+)/g)].map(x => x[1])
    const selTags = [...selector.matchAll(/(?:^|[+>~\s,])\s*(\w+)/g)].map(x => x[1].toLowerCase()).filter(Boolean)
    const relevant = selClasses.some(c => classes.has(c)) ||
      selIds.some(id => ids.has(id)) ||
      selTags.some(t => tags.has(t))
    return relevant ? `${selector} { ${body} }` : null
  }).filter(Boolean).join('\n')

  return rules || css // Fallback auf komplettes CSS, falls Filter zu aggressiv war
}

// Strukturierter Output per Delimiter: Das Modell wrappt sein HTML zwischen
// <<<VARIANT_HTML>>> und <</VARIANT_HTML>>>. Robuster als Markdown-Code-Fences,
// die das Modell oft vergisst oder falsch formatiert.
const DELIM_START = '<<<VARIANT_HTML>>>'
const DELIM_END = '<</VARIANT_HTML>>>'

// CSS-Delimiter für Reorder-Mode: reines CSS ohne HTML-Wrapper.
const CSS_DELIM_START = '<<<VARIANT_CSS>>>'
const CSS_DELIM_END = '<</VARIANT_CSS>>>'

function parseStructuredOutput(text: string): string {
  const html = text.trim()
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

function parseCssOutput(text: string): string {
  const css = text.trim()
  const start = css.indexOf(CSS_DELIM_START)
  const end = css.indexOf(CSS_DELIM_END)
  if (start !== -1 && end !== -1 && end > start) {
    return css.slice(start + CSS_DELIM_START.length, end).trim()
  }
  // Fallback: CSS-Code-Fences
  const fence = css.match(/^```(?:css)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()
  // Fallback: kein Delimiter, kein Fence → nimm alles als CSS falls es CSS-Syntax hat
  if (/[{]/.test(css) && /}/.test(css)) return css
  return ''
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

// Reorder-Prompt: erzeugt CSS, das zwei Elemente visuell tauscht.
// Kein Figma-JSON nötig — der Tausch ist ein rein strukturelles CSS-Problem.
// Die beiden Selektoren + HTML-Kontext reichen für den Prompt.
function buildReorderPrompt(
  selectorA: string,
  selectorB: string,
  siteCss: string | null,
  userInstructions: string
): string {
  const filteredCss = siteCss || '(kein Site-CSS vorhanden)'
  return [
    'Du erstellst CSS-Regeln für einen visuellen Element-Tausch in einem A/B-Test.',
    '',
    'Zwei Elemente sollen ihre Position im Layout tauschen — NUR mit CSS, KEINE DOM-Manipulation.',
    '',
    `Element A (Selektor): ${selectorA}`,
    `Element B (Selektor): ${selectorB}`,
    '',
    'Anleitung:',
    '- Beide Elemente sind Geschwister im selben Eltern-Container (flex/grid/normal flow).',
    '- Verwende flexbox `order` (wenn Eltern flex/grid) oder `flex-direction: row-reverse/column-reverse`.',
    '- Falls der Eltern-Container kein flex/grid ist, setze `display: flex` darauf (mit existierenden Layout-Werten aus dem Site-CSS).',
    '- Stelle sicher, dass die Selektoren exakt matchen — verwende die oben genannten Selektoren 1:1.',
    '- Keine Magic Numbers — orientiere dich an den Werten aus dem Site-CSS.',
    '',
    'Site-CSS (gefiltert, als Referenz für existierende Layout-Werte):',
    filteredCss,
    '',
    userInstructions ? `Nutzer-Vorgabe: ${userInstructions}` : '',
    '',
    'REGELN:',
    '- Gib NUR CSS aus. Kein HTML, keine Erklärungen, kein Markdown.',
    '- Jeder Selektor, den du verwendest, MUSS im Site-CSS oder in den genannten Selektoren vorkommen.',
    '- Keine globalen Selektoren wie `*` oder `body`.',
    '- Füge kurze CSS-Kommentare (`/* */`) hinzu, die erklären, was getauscht wird.',
    '',
    `WICHTIG - Output-Format: Deine Antwort muss mit ${CSS_DELIM_START} beginnen und mit ${CSS_DELIM_END} enden.`,
    `Dazwischen steht NUR das CSS. Kein Text vor ${CSS_DELIM_START} oder nach ${CSS_DELIM_END}.`,
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
    mode?: string
    selector_b?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, frameContent, feedback, previousHtml } = body
  const scope = body.scope === 'text' || body.scope === 'color' ? body.scope : 'all'
  const userInstructions = body.userInstructions || ''
  const mode = body.mode === 'reorder' || body.mode === 'both' ? body.mode : 'content'
  if (!testId) {
    return Response.json({ error: 'testId required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')
  const isTemp = user.plan === 'temp'

  const selectColumns = 'original_html, site_css, framework, selector, reorder_selector, variant_b_html'
  const ownerCol = isTemp ? 'temp_session_id' : 'user_id'
  const { data: test, error: fetchErr } = await supabase
    .from('tests')
    .select(selectColumns)
    .eq('id', testId)
    .eq(ownerCol, user.userId)
    .single()

  if (fetchErr || !test) {
    return Response.json({ error: 'test not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Temp-Sessions: hartes Budget pro SESSION (Plan SEC-06).
  //
  // Vorher stand hier nur `if (isTemp && test.variant_b_html)` — also eine
  // Gratis-Generierung pro TEST. In Kombination mit "Temp-User: kein Limit" in
  // /api/tests ergab das: 1 unauthentifiziert erzeugte Session -> beliebig viele
  // Tests -> beliebig viele kostenlose OpenAI-Calls. OPENAI_MAX_MONTHLY_COST
  // greift dort nicht, weil es an profiles.monthly_gen_cost haengt und
  // Temp-Sessions kein Profil haben.
  //
  // consume_temp_session_gen (Migration 031) prueft und bucht atomar.
  if (isTemp) {
    const { data: allowed } = await supabase.rpc('consume_temp_session_gen', {
      p_session_id: user.userId,
      p_limit: TEMP_SESSION_GEN_LIMIT,
    })
    if (allowed !== true) {
      return Response.json(
        {
          error: 'free_gen_limit',
          message: 'Sign up to generate more variants.',
          signup_url: '/signup?source=figma-plugin&temp_token=' + encodeURIComponent(user.userId),
        },
        { status: 402, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  // DSGVO: PII-Scan vor OpenAI-Sendung. original_html kann personenbezogene
  // Daten enthalten (E-Mails, Telefonnummern im gepickten DOM-Element).
  // Reorder-Mode überspringt den Scan, weil kein original_html ans Modell geht.
  if (mode !== 'reorder') {
    const pii = scanPII(test.original_html)
    if (pii) {
      const fields = PII_PATTERNS.filter(p => pii[p.key]?.length).map(p => p.label)
      console.warn('[generate] PII detected in original_html, blocking OpenAI send:', fields)
      return Response.json(
        {
          error: 'PII detected in element content',
          message: `The selected element contains personal data (${fields.join(', ')}). Remove it from your page and try again.`,
          piiFields: fields,
        },
        { status: 422, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  // Usage-Limit: atomarer Check via RPC (Reset + Limit + Increment in einer Transaktion).
  // Kein separates Profil-Read nötig — die DB-Funktion macht alles.
  // ponytail: increment_gen_cost replaced manual check+reset to fix TOCTOU race.
  // Cost wird VOR dem OpenAI-Call reserviert. Bei OpenAI-Fehlschlag ist der Betrag
  // ($0.005) verloren — bei diesem Volumen akzeptabel. Upgrade-Pfad: Refund-RPC.
  // Temp-User: überspringen (1-Free-Gen-Limit oben greift stattdessen).
  if (!isTemp) {
    const monthlyBudget = getAIMonthlyBudget(user.plan)
    const { data: withinLimit, error: limitErr } = await supabase.rpc('increment_gen_cost', {
      p_user_id: user.userId,
      p_amount: ESTIMATED_COST_PER_GEN,
      p_limit: monthlyBudget,
    })

    if (limitErr || withinLimit === false) {
      return Response.json(
        { error: 'monthly generation limit reached', message: `OpenAI budget exhausted ($${monthlyBudget}/mo). Resets on the 1st.` },
        { status: 429, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  // Mit Feedback + vorigem Output → Verfeinerung, sonst Erstgenerierung.
  // Reorder-Mode hat eigenen Prompt-Pfad.
  const isRefinement = !!(feedback && previousHtml) && mode !== 'reorder'
  let prompt: string
  let systemPrompt: string
  let temperature: number
  let variantHtml = ''
  let variantCss = ''

  if (mode === 'reorder') {
    // Reorder-Modus: generiere CSS, kein HTML.
    const reorderSelector = test.reorder_selector || body.selector_b || null
    if (!reorderSelector) {
      return Response.json(
        { error: 'selector_b or reorder_selector required for reorder mode' },
        { status: 400, headers: corsHeaders('POST, OPTIONS') }
      )
    }
    systemPrompt = REORDER_SYSTEM_PROMPT
    prompt = buildReorderPrompt(
      test.selector || body.selector_b || '',
      reorderSelector,
      test.site_css,
      userInstructions
    )
    temperature = 0.2 // deterministisch — CSS muss exakt sein
  } else {
    // Content-Modus: bestehender HTML-Flow
    systemPrompt = SYSTEM_PROMPT
    prompt = isRefinement
      ? buildRefinePrompt(previousHtml, feedback, scope, userInstructions)
      : FEW_SHOT_PROMPT + '\n\n' + buildPrompt(test.original_html, test.site_css, test.framework, frameContent, scope, userInstructions)
    temperature = scope === 'text' ? 0.6 : 0.3
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY missing' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  let warnings: string[] = []
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: 4096,
      }),
    })
    if (!res.ok) throw new Error(`openai ${res.status}`)
    const json = await res.json()
    const raw = json.choices?.[0]?.message?.content ?? ''

    if (mode === 'reorder') {
      variantCss = parseCssOutput(raw)
      if (!variantCss) throw new Error('empty CSS response')
    } else {
      variantHtml = parseStructuredOutput(raw)
      if (!variantHtml) throw new Error('empty response after stripFences')
      const check = validateOutput(variantHtml)
      warnings = check.warnings
    }
  } catch (e) {
    safeError('generate', e)
    return Response.json({ error: 'AI generation failed' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  }

  if (warnings.length) {
    console.warn('[generate] validation warnings:', warnings)
  }

  const updatePayload: Record<string, string | null> = {}
  if (mode === 'reorder') {
    updatePayload.variant_b_css = variantCss
  } else {
    updatePayload.variant_b_html = variantHtml
  }

  const { error: updateErr } = await supabase
    .from('tests')
    .update(updatePayload)
    .eq('id', testId)
    .eq(ownerCol, user.userId)

  if (updateErr) {
    safeError('generate', updateErr)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // Cost-Tracking wurde bereits beim Check inkrementiert (atomar, s.o.).
  // ponytail: kein zweiter RPC-Call nötig — increment_gen_cost macht beides in einem.

  const response: Record<string, unknown> = {}
  if (mode === 'reorder') {
    response.css = variantCss
  } else {
    response.html = variantHtml
    response.siteCss = test.site_css || null
    if (warnings.length) response.warnings = warnings
    response.filtered_css = isRefinement ? undefined : true
  }
  return Response.json(response, { headers: corsHeaders('POST, OPTIONS') })
}
