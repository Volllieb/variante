// Security: EINE Stelle entscheidet, für welche Domain ein User Tests anlegen darf.
//
// Plan SEC-01: Die Logik existierte dreifach — in /api/tests, in
// lib/agentTools.ts (createTest) und in /api/test-wizard/create GAR NICHT.
// Ausgerechnet der Wizard ist der Pfad, den das Dashboard tatsächlich benutzt.
// Damit konnte jeder registrierte Free-User einen aktiven Test mit beliebigem
// site_url anlegen — inklusive fremder Kundendomains und www.getvariante.com
// selbst. /api/resolve liefert Tests allein nach site_host aus; ab.js injiziert
// variant_b_html/css dann auf jeder Seite mit installiertem Snippet.

import { supabase } from '@/lib/supabase'

/**
 * Host-Normalisierung. Muss mit der generierten Spalte `tests.site_host`
 * (Migration 021) und mit hostOf() in /api/resolve übereinstimmen —
 * __tests__/resolve-host-parity.mjs bewacht genau diese Parität.
 */
export function hostOf(u: string): string {
  return u
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .replace(/^www\./, '')
}

export type DomainGateResult =
  | { ok: true; siteUrl: string }
  | { ok: false; status: 400 | 403; error: string }

/**
 * Prüft, ob `siteUrl` zu einer verifizierten Domain des Users gehört.
 *
 * @param siteUrl  Vom Client gewünschte Ziel-URL. Leer/undefined → erste
 *                 verifizierte Domain des Users (Bequemlichkeit für das Plugin).
 */
export async function assertOwnedDomain(
  userId: string,
  siteUrl: string | null | undefined
): Promise<DomainGateResult> {
  const { data: verifiedDomains, error } = await supabase
    .from('domains')
    .select('url')
    .eq('user_id', userId)
    .eq('verified', true)

  if (error) {
    return { ok: false, status: 400, error: 'Could not verify domain ownership. Please try again.' }
  }

  const verifiedUrls = (verifiedDomains ?? []).map((d) => d.url)

  if (verifiedUrls.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'No verified website. Add and verify your website in the dashboard first.',
    }
  }

  if (!siteUrl) return { ok: true, siteUrl: verifiedUrls[0]! }

  const allowedHosts = verifiedUrls.map(hostOf)
  const targetHost = hostOf(siteUrl)

  if (!allowedHosts.includes(targetHost)) {
    return {
      ok: false,
      status: 403,
      error: `site_url must match one of your verified websites (${allowedHosts.join(', ')}). Got: ${targetHost}`,
    }
  }

  return { ok: true, siteUrl }
}
