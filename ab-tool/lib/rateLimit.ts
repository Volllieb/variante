// Security: In-Memory Rate-Limiter für öffentliche Endpunkte (/assign, /event).
// Schützt vor Counter-Inflation und Cost-Explosion durch missbräuchliche Requests.
// Sliding-Window-Ansatz — keine externen Dependencies.
//
// Limitation: Bei Vercel-Serverless (mehrere Instanzen) ist der State pro Instanz.
// Für Production-Grade würde man Upstash Redis o.ä. verwenden. Als erste
// Verteidigungslinie gegen Script-Kiddies ausreichend.

const buckets = new Map<string, number[]>()

// Alte Einträge periodisch aufräumen, damit der Map nicht unbegrenzt wächst.
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000 // 1 min

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter(t => now - t < 60_000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  cleanup()
  const now = Date.now()
  const timestamps = buckets.get(key) || []
  const recent = timestamps.filter(t => now - t < windowMs)
  if (recent.length >= maxRequests) return false
  recent.push(now)
  buckets.set(key, recent)
  return true
}

// Client-IP aus Vercel-Headern extrahieren (x-forwarded-for oder x-real-ip).
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
