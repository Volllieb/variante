import { headers, cookies } from 'next/headers'
import { getLang } from './landingCopy'
import type { Lang } from './landingCopy'

/**
 * Resolves the visitor's language from the `lang` cookie, falling back to
 * Accept-Language. Server-only — `next/headers` is not available on the client.
 *
 * Shared by the root layout (`<html lang>`) and the landing page so the two can
 * never disagree about which language the page is in.
 */
export async function detectLang(): Promise<Lang> {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()])
  return getLang(headersList.get('accept-language'), cookieStore.get('lang')?.value ?? null)
}
