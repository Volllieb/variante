// Security: Rate-Limiter für öffentliche Endpunkte (/assign, /event).
// Schützt vor Counter-Inflation und Cost-Explosion durch missbräuchliche Requests.
//
// Produktion: Upstash Redis (globaler State über alle Vercel-Instanzen).
// Dev: In-Memory-Map als Fallback (pro-Instanz, kein Redis nötig).
//
// Env-Vars für Production:
//   UPSTASH_REDIS_REST_URL=https://<db>.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=<read+write token>

import { Redis } from '@upstash/redis'

let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    console.log('[rateLimit] Upstash Redis aktiviert')
  }
} catch {
  console.warn('[rateLimit] Upstash Redis nicht verfügbar — In-Memory-Fallback')
}

// In-Memory-Fallback für Dev (keine Redis-Abhängigkeit).
const buckets = new Map<string, number[]>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000

function cleanupMemory() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter(t => now - t < 60_000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  // Redis-Pfad (Production)
  if (redis) {
    const redisKey = `rl:${key}`
    const now = Date.now()
    const windowStart = now - windowMs

    // ZSET: füge aktuellen Timestamp hinzu, entferne alte Einträge, zähle.
    const multi = redis.multi()
    multi.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` })
    multi.zremrangebyscore(redisKey, 0, windowStart)
    multi.zcard(redisKey)
    multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1)
    const results = await multi.exec()
    // results: [zaddResult, zremResult, zcardResult, expireResult]
    const count = (results?.[2] as number) ?? 0
    return count <= maxRequests
  }

  // In-Memory-Pfad (Dev)
  cleanupMemory()
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
