// TEMPORARY: Reset all daily preview rate limits in Redis.
// DELETE this file after use.
import { Redis } from '@upstash/redis'

export async function POST() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 })
  }

  const redis = new Redis({ url, token })

  try {
    const keys = await redis.keys('rl:preview:day:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return Response.json({ reset: keys.length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
