// Die 4 Tools des autonomen CRO-Agents (/api/agent).
// Als Factory gebaut: die Tools sind an den authentifizierten User gebunden.
// Sicherheits-Entscheidung: user_id ist KEIN Tool-Parameter — das LLM kann
// keine fremde User-ID einschleusen, createTest nutzt immer den Auth-Kontext.

import { tool } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import type { ApiUser } from '@/lib/auth'
import { stripForCRO, extractStructure, extractStyleContext, analyzePage } from '@/lib/croAnalyze'
import { generateVariantText } from '@/lib/generateVariantText'import { redactPII } from '@/lib/pii'
export function makeAgentTools(user: ApiUser) {
  // ─── Tool 1: fetchSite ───

  const fetchSite = tool({
    description:
      'Fetched und parsed die HTML-Struktur einer Landingpage. Gibt bereinigtes HTML, extrahierte Struktur (DOM-Baum) und Style-Kontext (Farben, CSS-Klassen) zurück.',
    inputSchema: z.object({
      url: z.string().describe('Die vollständige URL der Landingpage (mit https://)'),
    }),
    execute: async ({ url }) => {
      // Nur http/https erlauben
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Only http/https URLs allowed')
      }

      // SSRF-Check (aus lib/ssrf.ts)
      let hostname: string
      try {
        hostname = new URL(url).hostname
      } catch {
        throw new Error(`Invalid URL: ${url}`)
      }
      if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
        throw new Error(`Blocked host: ${hostname}`)
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'variante-cro-agent/1.0 (+https://www.getvariante.com)',
            'Accept': 'text/html,application/xhtml+xml',
          },
          redirect: 'follow',
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

        const html = await res.text()
        if (!html || html.length < 100) {
          throw new Error('Page returned no usable content (empty or JS-rendered SPA?)')
        }

        const structure = extractStructure(html)
        const styleContext = extractStyleContext(html)

        return {
          html: stripForCRO(html),
          structure,
          styleContext,
          title: html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '',
          url,
          success: true,
        }
      } catch (err) {
        safeError('agent-fetchSite', err)
        throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : 'unknown error'}`)
      } finally {
        clearTimeout(timeout)
      }
    },
  })

  // ─── Tool 2: analyzeCRO ───

  const analyzeCRO = tool({
    description:
      'Analysiert eine Landingpage nach CRO-Kriterien und gibt 3-4 konkrete A/B-Test-Vorschläge zurück.',
    inputSchema: z.object({
      html: z.string().describe('Das bereinigte HTML der Seite (von fetchSite)'),
      structure: z.string().describe('Die extrahierte Struktur (von fetchSite)'),
      pageGoal: z.enum(['signups', 'purchases', 'engagement']).default('signups').describe('Das Conversion-Ziel der Seite'),
      industry: z.string().optional().describe('Optional: Die Branche (saas, ecommerce, agency, etc.)'),
    }),
    execute: async ({ html, structure, pageGoal, industry }) => {
      const suggestions = await analyzePage(html, structure, { pageGoal, industry })

      if (!suggestions.length) {
        throw new Error('No CRO suggestions generated')
      }

      return {
        suggestions,
        count: suggestions.length,
        pageGoal,
        industry: industry ?? 'unknown',
      }
    },
  })

  // ─── Tool 3: generateVariant ───

  const generateVariant = tool({
    description:
      'Generiert eine konkrete Test-Variante (Text, Farbe, CSS oder Layout) basierend auf einem CRO-Vorschlag.',
    inputSchema: z.object({
      element: z.string().describe('Beschreibung des zu ändernden Elements'),
      original: z.string().describe('Der aktuelle Zustand (Text, Farbe, etc.)'),
      description: z.string().describe('Was geändert werden soll'),
      type: z.enum(['text', 'color', 'css', 'layout']).describe('Art der Änderung'),
      selector: z.string().optional().describe('Optional: CSS-Selector des Elements'),
      pageContext: z.string().optional().describe('Optional: HTML-Kontext um das Element'),
    }),
    execute: async ({ element, original, description, type, selector, pageContext }) => {
      try {
        const result = await generateVariantText({
          element,
          original,
          variantDescription: description,
          type,
          selector,
          pageContext,
        })

        return { ...result, success: true }
      } catch (err) {
        // Bewusst kein throw: der Agent soll den Vorschlag überspringen
        // und mit dem nächsten weitermachen, nicht den Run abbrechen.
        safeError('agent-generateVariant', err)
        return {
          variant: '',
          explanation: description,
          success: false,
          error: err instanceof Error ? err.message : 'unknown error',
        }
      }
    },
  })

  // ─── Tool 4: createTest ───

  const createTest = tool({
    description:
      'Erstellt einen A/B-Test in variante. Validiert Domain-Gate und Plan-Limits. Nur aufrufen, wenn generateVariant erfolgreich war.',
    inputSchema: z.object({
      name: z.string().max(256).describe('Name des Tests, z.B. "CTA-Text Hero" oder "Social Proof" (kurz, deskriptiv, kein Präfix/Suffix)'),
      site_url: z.string().describe('URL der Landingpage'),
      selector: z.string().max(512).optional().describe('CSS-Selector des zu testenden Elements'),
      goal: z.string().max(256).optional().describe('Conversion-Ziel (z.B. "button-click", "form-submit")'),
      variant_html: z.string().optional().describe('HTML/Text der Variante B (bei type=text)'),
      variant_css: z.string().optional().describe('CSS der Variante B (bei type=color/css/layout)'),
    }),
    execute: async ({ name, site_url, selector, goal, variant_html, variant_css }) => {
      // ─── Domain-Gate (gleiche Logik wie /api/tests) ───
      const { data: verifiedDomains } = await supabase
        .from('domains')
        .select('url')
        .eq('user_id', user.userId)
        .eq('verified', true)

      const verifiedUrls = verifiedDomains?.map(d => d.url) ?? []

      function hostOf(u: string) {
        return u.trim().toLowerCase()
          .replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
          .replace(/^www\./, '')
      }

      if (verifiedUrls.length === 0) {
        throw new Error('No verified domain. The user must verify their website in the dashboard first.')
      }

      const testHost = hostOf(site_url)
      const allowedHosts = verifiedUrls.map(u => hostOf(u))
      if (!allowedHosts.includes(testHost)) {
        throw new Error(`site_url must match a verified domain. Allowed: ${allowedHosts.join(', ')}. Got: ${testHost}`)
      }

      // ─── Free-Gating: max 1 aktiver Test ───
      if (user.plan !== 'pro' && user.plan !== 'agency') {
        const { count } = await supabase
          .from('tests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.userId)
          .neq('status', 'done')
        if ((count ?? 0) >= 1) {
          throw new Error('Free plan allows only 1 active test. Skip remaining test creation.')
        }
      }

      // ─── Insert (Spalten heißen variant_b_html / variant_b_css, Schema 001/016) ───
      const { data, error } = await supabase
        .from('tests')
        .insert({
          name,
          site_url,
          selector: selector ?? null,
          goal: goal ?? null,
          variant_b_html: variant_html ?? null,
          variant_b_css: variant_css ?? null,
          user_id: user.userId,
          // Kein traffic_split, min_visitors, min_uplift → DB-Defaults
        })
        .select('id, snippet_key')
        .single()

      if (error || !data) {
        safeError('agent-createTest', error)
        throw new Error('Failed to create test in database')
      }

      // ─── Event loggen ───
      await supabase.rpc('log_event', {
        p_test_id: data.id,
        p_user_id: user.userId,
        p_type: 'created',
        p_message: `[Agent] Test "${name}" created`,
      })

      return {
        id: data.id,
        snippet_key: data.snippet_key,
        name,
        success: true,
      }
    },
  })

  return { fetchSite, analyzeCRO, generateVariant, createTest }
}

export type AgentTools = ReturnType<typeof makeAgentTools>
