/**
 * Einfacher Redis-Cache-Wrapper — nutzt die existierende Upstash-Connection
 * aus lib/rateLimit.ts für Server-Side-Caching von Read-Modellen.
 *
 * Pattern: Cache-Aside (Lazy-Loading). Bei Cache-Miss: DB lesen → Cache setzen.
 * Bei Mutation: Cache invalidieren → nächster Read füllt neu.
 *
 * Redis-Key-Namespace:
 *   dashboard:tests:{userId}    — Test-Liste (TTL 30s)
 *   dashboard:domains:{userId}  — Domain-Liste (TTL 60s)
 *   figma:stats:{userId}        — Figma-Plugin-Stats (TTL 30s)
 */

import { Redis } from '@upstash/redis'

let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
} catch {
  // Dev: kein Redis — Cache ist ein No-op
}

/**
 * Wert aus dem Cache lesen. Gibt null zurück bei Miss oder wenn Redis nicht verfügbar ist.
 */
export async function cacheGet(key: string): Promise<string | null> {
  if (!redis) return null
  try {
    return await redis.get<string>(key)
  } catch {
    return null // Fail open: Cache-Miss ist nie kritisch
  }
}

/**
 * Wert in den Cache schreiben mit TTL in Sekunden.
 */
export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch {
    // Fail open: Cache-Set ist optional
  }
}

/**
 * Einzelnen Cache-Key löschen (z. B. nach Mutation).
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(key)
  } catch {
    // Fail open
  }
}

/**
 * Cache-Keys per Pattern löschen (z. B. "dashboard:tests:*" nach Test-Mutation).
 * Nutzt SCAN für produktionssichere Iteration (kein KEYS-Block).
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return
  try {
    let cursor = '0'
    const keys: string[] = []
    do {
      const [nextCursor, batch] = await redis.scan(cursor, { match: pattern, count: 50 })
      cursor = nextCursor as string
      keys.push(...(batch as string[]))
    } while (cursor !== '0')

    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Fail open
  }
}
