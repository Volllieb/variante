import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { AccountClient } from './AccountClient'

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Plan CODE-06: Parallele Queries statt sequenziellem Wasserfall.
  // domains und profile sind unabhängig voneinander.
  const [domainsRes, profileRes, prefsRes] = await Promise.all([
    supabase
      .from('domains')
      .select('id, url, verified, verified_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('avatar_url, plan, api_token, notify_on_winner')
      .eq('user_id', user.id)
      .single(),
    // Separat und fehlertolerant: Migration 038 läuft manuell, der Deploy
    // automatisch. Solange die Spalte fehlt, weist PostgREST die ganze Query
    // ab — im Haupt-Select würde das Plan, Avatar und API-Token mitreißen und
    // einem Pro-Kunden „free" ohne Token anzeigen.
    supabase
      .from('profiles')
      .select('auto_promote_winner')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <AccountClient
      email={user.email ?? ''}
      domains={domainsRes.data ?? []}
      avatarUrl={profileRes.data?.avatar_url ?? null}
      plan={profileRes.data?.plan ?? 'free'}
      apiToken={profileRes.data?.api_token ?? null}
      // Plan RA-06: Nur ein explizites false schaltet ab — NULL ist Altbestand
      // vor Migration 038 und entspricht dem dokumentierten Default.
      notifyOnWinner={profileRes.data?.notify_on_winner !== false}
      autoPromoteWinner={prefsRes.data?.auto_promote_winner !== false}
    />
  )
}
