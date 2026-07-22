// Klassifikation von Supabase-Auth-Fehlern für Login und Signup.
// ponytail: Die Funktion stand zeichengleich in app/login/page.tsx und
// app/signup/page.tsx — inklusive `error: any`. Jetzt einmal, mit `unknown`
// und einem echten Type-Guard statt eines Casts.

export type ErrKind = 'not-confirmed' | 'rate-limit' | 'network' | 'generic'

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message
    if (typeof m === 'string') return m
  }
  try {
    return JSON.stringify(error) ?? ''
  } catch {
    return String(error)
  }
}

export function classifyAuthError(error: unknown): ErrKind {
  const msg = messageOf(error).toLowerCase()
  if (!msg) return 'generic'
  if (msg.includes('not confirmed') || msg.includes('email not confirmed')) return 'not-confirmed'
  if (
    msg.includes('too many') ||
    msg.includes('rate limit') ||
    msg.includes('security purposes') ||
    msg.includes('try again later')
  ) {
    return 'rate-limit'
  }
  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('load failed')
  ) {
    return 'network'
  }
  return 'generic'
}
