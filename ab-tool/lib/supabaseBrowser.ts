'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser-Supabase-Client (Anon-Key) für die Login-/Signup-Seiten.
// Speichert die Session in Cookies, sodass der Server sie lesen kann.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn(
      '⚠ Supabase env vars missing — auth actions won\'t work in local dev.\n' +
      '  Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
    // Return a non-functional placeholder so callers don't crash.
    // Network calls will fail gracefully — catch handlers already exist in callers.
    return createBrowserClient(
      'http://localhost:54321',
      'placeholder-anon-key'
    )
  }
  return createBrowserClient(url, key)
}
