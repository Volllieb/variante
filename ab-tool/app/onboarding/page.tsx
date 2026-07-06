import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth), jetzt anlegen
  await ensureProfile(user.id)

  const searchParams = await props.searchParams
  const source = searchParams.source || ''
  const upgraded = searchParams.upgraded === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('api_token, plan, onboarded')
    .eq('user_id', user.id)
    .single()

  // UX: Bereits onboarded → nicht erneut Onboarding zeigen
  if (profile?.onboarded) redirect('/dashboard')

  // Sobald der User die Onboarding-Seite erreicht (egal über welchen Pfad),
  // gilt Onboarding als gesehen — das Dashboard-Gate leitet ihn danach nicht
  // mehr hierher zurück, auch wenn er "Skip" klickt oder die Seite verlässt.
  await supabase.from('profiles').update({ onboarded: true }).eq('user_id', user.id)

  return (
    <OnboardingClient
      email={user.email ?? ''}
      apiToken={profile?.api_token ?? ''}
      plan={profile?.plan ?? 'free'}
      source={source}
      upgraded={upgraded}
    />
  )
}
