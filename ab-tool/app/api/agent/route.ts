// Autonomer CRO-Agent: Analyze → Generate → Create in einem Durchlauf.
// Vercel AI SDK streamText mit 4 Tools (lib/agentTools.ts), Streaming-UI
// via useChat in AgentPanel.tsx. Konzept: docs/future-features/autonomous-ab-agent.md

import { streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { makeAgentTools } from '@/lib/agentTools'
import { supabase } from '@/lib/supabase'

// Agent-Runs laufen länger als normale API-Calls (4+ sequentielle LLM-Calls).
export const maxDuration = 120

// Geschätzte Kosten pro Agent-Run (gpt-4o-mini, max 10 Steps):
// Analyse ~$0.005 + 3× Variant-Gen ~$0.003 + Agent-Loop ~$0.01 ≈ $0.02.
// Konservativ $0.03 — wird upfront gegen das Monatslimit gebucht.
const ESTIMATED_COST = 0.03
const MAX_MONTHLY_COST_PRO = Number(process.env.OPENAI_MAX_MONTHLY_COST) || 20
const MAX_MONTHLY_COST_AGENCY = Number(process.env.OPENAI_MAX_MONTHLY_COST_AGENCY) || 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

const AGENT_SYSTEM_PROMPT = `Du bist ein autonomer CRO-Agent für variante, ein A/B-Testing-Tool für Landingpages.
Deine Aufgabe: Analysiere die Landingpage eines Nutzers, finde die 3 wirkungsvollsten
Optimierungsmöglichkeiten, generiere konkrete Varianten und erstelle A/B-Tests.

ABLAUF (immer in dieser Reihenfolge):
1. **fetchSite(url)** — Hole und parse die Landingpage
2. **analyzeCRO(html, structure, pageGoal)** — Identifiziere die Top-3-Optimierungen
3. **generateVariant(element, original, description, type, selector?)** — Generiere eine Variante pro Vorschlag
4. **createTest(name, site_url, selector?, goal?, variant_html?, variant_css?)** — Lege den Test an

REGELN:
- Immer ALLE 4 Schritte ausführen. Kein Schritt darf übersprungen werden.
- Maximal 3 Tests pro Run. Wenn analyzeCRO mehr als 3 Vorschläge liefert, nimm die Top 3.
- Bei generateVariant-Fehlern (success: false): Überspringe diesen Vorschlag und mache mit dem nächsten weiter. Nicht alles abbrechen.
- createTest NUR aufrufen, wenn generateVariant erfolgreich war.
- Bei type=text: das Ergebnis als variant_html übergeben. Bei color/css/layout: variant_css übergeben.
- Test-Namen kurz und deskriptiv, z.B. "CTA-Text Hero" oder "Social Proof". Kein "[AI]"-Präfix, kein "Optimierung"-Suffix.
- Am Ende: Gib eine strukturierte Zusammenfassung:
  "✅ **{N} Tests erstellt:**
  1. **{Test-Name}** — {Element} ({Typ})
  ...
  ❌ **{M} Vorschläge übersprungen:** {Grund}"

KOMMUNIKATION:
- Sprich Deutsch mit dem User.
- Gib zwischen den Schritten kurze Status-Updates (z.B. "Analysiere landingpage.com…", "3 Optimierungen gefunden, generiere Varianten…").
- Sei präzise, kein Marketing-Blabla.
- Wenn ein Test erfolgreich angelegt wurde, nenne den Test-Namen und was getestet wird.
- Sei effizient mit deinen Tool-Calls — max 10 Steps insgesamt.`

export async function POST(req: Request) {
  // ─── Auth ───
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // ─── Pro-Gate (wie /api/suggestions) ───
  if (user.plan !== 'pro' && user.plan !== 'agency') {
    return paymentRequired('POST, OPTIONS', 'The autonomous optimization agent requires a Pro plan.')
  }

  // ─── Body parsen (useChat schickt { messages, ...body } — wir lesen nur body) ───
  let domain: string | undefined
  let pageGoal: 'signups' | 'purchases' | 'engagement' = 'signups'
  try {
    const body = await req.json() as { domain?: string; pageGoal?: string }
    domain = body.domain
    if (body.pageGoal === 'purchases' || body.pageGoal === 'engagement') pageGoal = body.pageGoal
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  if (!domain || typeof domain !== 'string') {
    return Response.json({ error: 'domain is required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // ─── Domain normalisieren ───
  let url = domain.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  // ─── Cost-Limit: atomar prüfen + buchen (gleicher RPC wie /api/generate) ───
  const costLimit = user.plan === 'agency' ? MAX_MONTHLY_COST_AGENCY : MAX_MONTHLY_COST_PRO
  const { data: withinLimit, error: limitErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.userId,
    p_amount: ESTIMATED_COST,
    p_limit: costLimit,
  })
  if (limitErr || withinLimit === false) {
    return Response.json(
      { error: 'monthly generation limit reached', message: `OpenAI budget exhausted ($${costLimit}/mo). Resets on the 1st.` },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // ─── Agent Run ───
  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: AGENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analysiere ${url} und erstelle A/B-Tests. Conversion-Ziel: ${pageGoal}.`,
        },
      ],
      tools: makeAgentTools(user),
      stopWhen: stepCountIs(10), // Max 10 Tool-Calls pro Run — Kostenkontrolle
      temperature: 0.7,
      onFinish: async ({ toolCalls, toolResults, finishReason }) => {
        // Run persistieren (Audit + Monitoring, Tabelle: 019_agent_runs.sql)
        // + site_insights für Learning Loop v3 befüllen
        try {
          const testIds = toolResults
            .filter(tr => tr.toolName === 'createTest')
            .map(tr => (tr.output as { id?: string; success?: boolean }))
            .filter(o => o?.success && o?.id)
            .map(o => o.id as string)

          const suggestions = toolResults
            .filter(tr => tr.toolName === 'analyzeCRO')
            .map(tr => (tr.output as { suggestions?: unknown })?.suggestions ?? [])
            .flat()

          const { error } = await supabase.from('agent_runs').insert({
            user_id: user.userId,
            domain: url,
            page_goal: pageGoal,
            suggestions_json: suggestions,
            tests_created: testIds.length > 0 ? testIds : null,
            tool_calls_count: toolCalls.length,
            cost_estimate: ESTIMATED_COST,
            finish_reason: finishReason,
          })
          if (error) safeError('agent-run-persist', error)

          // ─── site_insights upsert (Learning Loop v3) ───
          const fetchResult = toolResults.find(tr => tr.toolName === 'fetchSite')?.output as
            { url?: string; structure?: string; title?: string } | undefined
          const analyzeResult = toolResults.find(tr => tr.toolName === 'analyzeCRO')?.output as
            { suggestions?: unknown[]; industry?: string; pageGoal?: string } | undefined

          if (fetchResult?.url && analyzeResult?.suggestions?.length) {
            const { error: insightsErr } = await supabase.from('site_insights').upsert({
              user_id: user.userId,
              domain: url,
              page_url: fetchResult.url,
              page_goal: pageGoal,
              detected_industry: analyzeResult.industry ?? null,
              analysis_json: { structure: fetchResult.structure, title: fetchResult.title },
              top_opportunities: analyzeResult.suggestions.slice(0, 3),
              analyzed_at: new Date().toISOString(),
            }, { onConflict: 'user_id, domain, page_url' })
            if (insightsErr) safeError('agent-site-insights-upsert', insightsErr)
          }
        } catch (err) {
          safeError('agent-run-persist', err)
        }
      },
    })

    return result.toUIMessageStreamResponse({
      headers: corsHeaders('POST, OPTIONS'),
    })
  } catch (err) {
    safeError('agent-stream', err)
    return Response.json(
      { error: 'Agent execution failed' },
      { status: 500, headers: corsHeaders('POST, OPTIONS') }
    )
  }
}
