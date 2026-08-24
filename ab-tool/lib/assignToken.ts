// Plan DATA-01: Signiertes Assignment-Token als gemeinsame Quelle für
// /api/assign (Ausstellung) und /api/event (Prüfung + Replay-Dedup).
//
// Vorher lag `signToken`/`verifyToken` samt Secret-Fallback dupliziert in beiden
// Routen. Zwei Probleme, die hier behoben werden:
//
//  1. Secret-Fallback: `process.env.ASSIGN_SECRET || 'variante-assign-dev'`. Ist
//     die Env-Var in Produktion nicht gesetzt (aktuell der Fall), signiert der
//     Server mit einem im Repo stehenden, öffentlich bekannten Wert — jeder kann
//     Tokens fälschen. Neu: in Produktion wird ein fehlendes/zu kurzes Secret
//     hart abgelehnt (lautes Fail-Closed), nur in Dev greift der Fallback.
//
//  2. Replay: Das alte Token band nur (snippetKey, variant, exp). Ein einmal
//     abgefangenes Token war bis zum Ablauf beliebig oft einlösbar. Neu enthält
//     das Token eine Zufalls-Nonce; /api/event verwirft eine bereits gesehene
//     Nonce (markConversionOnce), sodass ein Token nur eine Conversion zählt.
//
// Bewusste Grenze: Im cookieless Default-Modus von ab.js überlebt das Token
// keinen Seitenwechsel (In-Memory pro Page-View). Cross-Page-Conversions kommen
// dann legitim OHNE Token — die werden weiterhin akzeptiert (Graceful
// Degradation), sind aber serverseitig nicht deduplizierbar. Das ist eine Folge
// der DSGVO-Entscheidung, keinen serverseitigen Besucher-State zu halten.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 30 * 60_000 // 30 Minuten
export const TOKEN_TTL_SECONDS = TOKEN_TTL_MS / 1000

let cachedSecret: string | null = null

/**
 * Löst das HMAC-Secret auf. In Produktion ist ein starkes ASSIGN_SECRET Pflicht;
 * fehlt es, wird geworfen statt still auf den öffentlichen Dev-Wert
 * zurückzufallen. Lazy (nicht auf Modulebene), damit der Build nie an einem
 * fehlenden Secret scheitert — der Fehler entsteht erst zur Laufzeit in Prod.
 */
function resolveSecret(): string {
  if (cachedSecret) return cachedSecret
  const s = process.env.ASSIGN_SECRET
  if (s && s.length >= 16) {
    cachedSecret = s
    return s
  }
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error(
      '[assignToken] ASSIGN_SECRET fehlt oder ist zu kurz (min. 16 Zeichen) in Produktion. ' +
        'Setze ein starkes ASSIGN_SECRET in den Vercel-Projekt-Env-Vars, bevor du deployst — ' +
        'ein Fallback auf das öffentlich bekannte Dev-Secret wird verweigert.'
    )
  }
  cachedSecret = 'variante-assign-dev'
  return cachedSecret
}

function sign(payload: string): string {
  return createHmac('sha256', resolveSecret()).update(payload).digest('hex').slice(0, 16)
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/**
 * Stellt ein Token für eine frische Zuweisung aus.
 * Format: `${snippetKey}.${variant}.${exp}.${nonce}.${sig}`
 */
export function signAssignToken(snippetKey: string, variant: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const nonce = randomBytes(9).toString('hex') // 18 Hex-Zeichen, kein '.'
  const payload = `${snippetKey}.${variant}.${exp}.${nonce}`
  return `${payload}.${sign(payload)}`
}

export type TokenCheck =
  | { valid: false }
  | { valid: true; nonce: string | null }

/**
 * Prüft ein Token. Akzeptiert das neue 5-teilige Format (mit Nonce) und —
 * für die Deploy-Übergangsphase, in der alte 4-teilige Tokens noch ~30 Min
 * unterwegs sein können — das alte 4-teilige Format ohne Nonce.
 *
 * `nonce` ist bei Erfolg gesetzt, wenn das Token dedupliziert werden kann
 * (neues Format), sonst null (Legacy).
 */
export function verifyAssignToken(snippetKey: string, variant: string, token: string): TokenCheck {
  const parts = token.split('.')

  if (parts.length === 5) {
    const [key, v, expStr, nonce, sig] = parts
    if (key !== snippetKey || v !== variant) return { valid: false }
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp) || Date.now() > exp) return { valid: false }
    if (!safeEqualHex(sig, sign(`${key}.${v}.${exp}.${nonce}`))) return { valid: false }
    return { valid: true, nonce }
  }

  // Legacy: `${key}.${variant}.${exp}.${sig}` (kein Nonce, kein Dedup)
  if (parts.length === 4) {
    const [key, v, expStr, sig] = parts
    if (key !== snippetKey || v !== variant) return { valid: false }
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp) || Date.now() > exp) return { valid: false }
    if (!safeEqualHex(sig, sign(`${key}.${v}.${exp}`))) return { valid: false }
    return { valid: true, nonce: null }
  }

  return { valid: false }
}
