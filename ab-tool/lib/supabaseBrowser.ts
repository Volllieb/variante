'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser-Supabase-Client (Anon-Key) für die Login-/Signup-Seiten.
// Speichert die Session in Cookies, sodass der Server sie lesen kann.
export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
