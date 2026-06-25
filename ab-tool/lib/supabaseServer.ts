import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
export async function getSessionUser() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
