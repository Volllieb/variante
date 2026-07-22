import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ponytail: Kein React.cache() mehr — in Next.js 16 mit Turbopack verursacht
// cache() + async sporadische "Cannot read properties of undefined"-Fehler.
// Die Middleware refresht die Session bereits, getUser() ist günstig genug
// für den einmaligen Aufruf pro Request (Layout + Page teilen sich den
// Request-Kontext, aber das ist ein vernachlässigbarer Overhead).
// Upgrade-Pfad: Sollte das zum Performance-Problem werden → request-level
// WeakMap oder AsyncLocalStorage statt cache().

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
// Die Middleware refresht den Token vorher, sodass getUser() zuverlässig
// die aktuelle Session sieht.
export async function getSessionUser() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
