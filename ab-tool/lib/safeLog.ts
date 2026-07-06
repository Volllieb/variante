// Security: Safe-Logging-Wrapper.
// Verhindert, dass rohe Fehlerobjekte (Supabase Postgres Errors) mit
// Query-Details in Logs landen. Loggt nur message und code — keine
// Parameter, keine Connection-Strings, keine Tabellennamen.
// In Development (NODE_ENV !== 'production') werden Stacktraces mitgeloggt.

export function safeError(context: string, err: unknown): void {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; code?: string; stack?: string }
    const extra = e.code ? `(code: ${e.code})` : ''
    if (process.env.NODE_ENV !== 'production' && e.stack) {
      console.error(`[${context}]`, e.message ?? 'unknown error', extra, '\n', e.stack)
    } else {
      console.error(`[${context}]`, e.message ?? 'unknown error', extra)
    }
  } else {
    console.error(`[${context}]`, String(err))
  }
}
