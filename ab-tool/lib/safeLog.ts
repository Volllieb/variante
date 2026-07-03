// Security: Safe-Logging-Wrapper.
// Verhindert, dass rohe Fehlerobjekte (Supabase Postgres Errors) mit
// Query-Details in Logs landen. Loggt nur message und code — keine
// Parameter, keine Connection-Strings, keine Tabellennamen.

export function safeError(context: string, err: unknown): void {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; code?: string }
    console.error(`[${context}]`, e.message ?? 'unknown error', e.code ? `(code: ${e.code})` : '')
  } else {
    console.error(`[${context}]`, String(err))
  }
}
