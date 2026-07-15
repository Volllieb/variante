// DSGVO / GDPR: PII-Erkennung und -Redaktion.
// scanPII(): Block-Check für User-Elemente (Figma→OpenAI). Blockt bei Fund.
// redactPII(): Ersetzt PII durch Platzhalter für Agent-Pfad (fremde Landingpages).
// Strategie: Agent-Pfad soll nicht blocken (jede Footer-Email würde sonst
// den Agent nutzlos machen), sondern PII unkenntlich machen vor OpenAI-Übergabe.

export interface PIIFindings {
  emails: string[]
  phones: string[]
  ibans: string[]
  cards: string[]
  ips: string[]
}

export type PIIKey = keyof PIIFindings

export const PII_PATTERNS: Array<{ key: PIIKey; re: RegExp; label: string }> = [
  { key: 'emails', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'email addresses' },
  { key: 'phones', re: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{3,8}/g, label: 'phone numbers' },
  { key: 'ibans', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g, label: 'IBANs' },
  { key: 'cards', re: /\b(?:\d[ -]*?){13,19}\b/g, label: 'credit card numbers' },
  { key: 'ips', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, label: 'IP addresses' },
]

const PII_HAYSTACK_THRESHOLD = 8

const PII_REPLACEMENTS: Record<PIIKey, string> = {
  emails: '[EMAIL]',
  phones: '[PHONE]',
  ibans: '[IBAN]',
  cards: '[CARD]',
  ips: '[IP]',
}

function filterMatch(key: PIIKey, m: string): boolean {
  if (key === 'phones') { const d = m.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15 }
  if (key === 'cards') { const d = m.replace(/\D/g, ''); return d.length >= 13 && d.length <= 19 }
  if (key === 'ips') { const o = m.split('.').map(Number); return o.length === 4 && o.every(x => x >= 0 && x <= 255) }
  return true
}

/** Block-Check: Findet PII und gibt sie zurück. null = sauber.
 *  Verwendet in /api/generate (User-Elemente vor OpenAI). */
export function scanPII(html: string | null): PIIFindings | null {
  if (!html || html.length < PII_HAYSTACK_THRESHOLD) return null
  const findings: PIIFindings = { emails: [], phones: [], ibans: [], cards: [], ips: [] }
  let found = false
  for (const { key, re } of PII_PATTERNS) {
    const matches = html.match(re)
    if (!matches?.length) continue
    const filtered = matches.filter(m => filterMatch(key, m))
    if (filtered.length > 0) { findings[key] = filtered; found = true }
  }
  return found ? findings : null
}

/** Redact-Modus: Ersetzt PII durch Platzhalter. Für den Agent-Pfad (fremde Seiten).
 *  Wird in stripForCRO() am Ende der Pipeline aufgerufen. */
export function redactPII(html: string): string {
  if (!html || html.length < PII_HAYSTACK_THRESHOLD) return html
  let result = html
  for (const { key, re } of PII_PATTERNS) {
    re.lastIndex = 0
    result = result.replace(re, (match) => {
      if (!filterMatch(key, match)) return match
      return PII_REPLACEMENTS[key]
    })
  }
  return result
}
