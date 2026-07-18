'use client'

// Global Error-Boundary — ersetzt das Root-Layout, wenn dieses selbst crasht.
// Inline-Styles statt Tailwind-Tokens: globals.css wird hier nicht geladen,
// und genau in diesem Fehlerfall darf nichts von der CSS-Pipeline abhängen.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#a1a1a1',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 60, fontWeight: 600, margin: 0 }}>500</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Something went wrong.</p>
          {error.digest && (
            <p style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '8px 16px',
              fontSize: 12,
              color: '#a1a1a1',
              background: 'transparent',
              border: '1px solid #2e2e2e',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
