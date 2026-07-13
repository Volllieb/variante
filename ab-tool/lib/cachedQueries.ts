import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'

/** Cached profile lookup — 30s TTL, per-user */
export async function getCachedProfile(userId: string) {
  return unstable_cache(
    async () => {
      const { data } = await supabase
        .from('profiles')
        .select('api_token, plan, has_figma_plugin')
        .eq('user_id', userId)
        .single()
      return data
    },
    [`profile-${userId}`],
    { revalidate: 30, tags: [`profile-${userId}`] }
  )()
}

/** Cached tests list — 30s TTL, per-user */
export async function getCachedTests(userId: string) {
  return unstable_cache(
    async () => {
      const { data } = await supabase
        .from('tests')
        .select(
          'id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      return data
    },
    [`tests-${userId}`],
    { revalidate: 30, tags: [`tests-${userId}`] }
  )()
}

/** Cached domains lookup — 30s TTL, per-user */
export async function getCachedDomains(userId: string) {
  return unstable_cache(
    async () => {
      const { data } = await supabase
        .from('domains')
        .select('url, verified')
        .eq('user_id', userId)
        .limit(5)
      return data
    },
    [`domains-${userId}`],
    { revalidate: 30, tags: [`domains-${userId}`] }
  )()
}

/** Invalidate all dashboard caches for a user (call after mutations) */
export function invalidateUserCaches(userId: string) {
  const { revalidateTag } = require('next/cache')
  revalidateTag(`profile-${userId}`)
  revalidateTag(`tests-${userId}`)
  revalidateTag(`domains-${userId}`)
}
