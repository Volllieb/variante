// Security: Safe-Logging-Wrapper.
// Verhindert, dass rohe Fehlerobjekte (Supabase Postgres Errors) mit
// Query-Details in Logs landen. Loggt nur message und code — keine
// Parameter, keine Connection-Strings, keine Tabellennamen.
// In Development (NODE_ENV !== 'production') werden Stacktraces mitgeloggt.

/**
 * Strukturierter Log-Eintrag für Produktion (JSON), human-readable in Development.
 * @param level  — info | warn | error
 * @param context — kurzer Kontext-String (z. B. "cron:check-winners")
 * @param message — menschenlesbare Beschreibung
 * @param extra   — optionale Metadaten (zählwerte, user-id, etc.)
 */
export function safeLog(
  level: 'info' | 'warn' | 'error',
  context: string,
  message: string,
  extra?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level,
      ctx: context,
      msg: message,
      ...extra,
    }))
  } else {
    const extraStr = extra ? ' ' + JSON.stringify(extra) : ''
    console.log(`[${context}] ${message}${extraStr}`)
  }
}

/**
 * Convenience-Wrapper: Warnung loggen (kein Error-Objekt nötig).
 * API-kompatibel mit safeError — nimmt einen beliebigen Error-ähnlichen Wert.
 */
export function safeWarn(context: string, err: unknown): void {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; code?: string }
    safeLog('warn', context, e.message ?? 'unknown warning', e.code ? { code: e.code } : undefined)
  } else {
    safeLog('warn', context, String(err))
  }
}

/**
 * PII-sicherer Error-Logger — loggt nur message und code, nie Query-Parameter.
 * Rückwärtskompatibel: alle existierenden safeError()-Aufrufe funktionieren unverändert.
 */
export function safeError(context: string, err: unknown): void {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; code?: string; stack?: string }
    const extra = e.code ? `(code: ${e.code})` : ''
    if (process.env.NODE_ENV !== 'production' && e.stack) {
      console.error(`[${context}]`, e.message ?? 'unknown error', extra, '\n', e.stack)
    } else if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        ctx: context,
        msg: e.message ?? 'unknown error',
        ...(e.code ? { code: e.code } : {}),
      }))
    } else {
      console.error(`[${context}]`, e.message ?? 'unknown error', extra)
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        ctx: context,
        msg: String(err),
      }))
    } else {
      console.error(`[${context}]`, String(err))
    }
  }
}
