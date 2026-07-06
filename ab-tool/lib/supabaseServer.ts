import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Supabase-Client für den Dashboard-Pfad (Server Components + Billing-Routen),
// der die eingeloggte Session aus den Cookies liest. Anon-Key + RLS.
export async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components ist set() teils nicht erlaubt — wird vom
            // Middleware-/Auth-Refresh übernommen, daher hier ignorierbar.
          }
        },
      },
    }
  )
}

// Eingeloggten User der aktuellen Session zurückgeben (oder null).
// React.cache() dedupliziert innerhalb eines Requests — Layout + Page
// teilen sich denselben Aufruf statt 2× cookies() + getUser().
export const getSessionUser = cache(async () => {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
