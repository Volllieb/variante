import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { SentryInit } from './SentryInit'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profileRes = await supabase
    .from('profiles')
    .select('plan, avatar_url')
    .eq('user_id', user.id)
    .single()

  const plan = profileRes.data?.plan ?? 'free'
  const avatarUrl = profileRes.data?.avatar_url ?? null

  return (
    <div className="min-h-screen bg-bg-0 font-[family-name:var(--font-sans)] text-[13px] antialiased">
      <SentryInit />
      <Sidebar email={user.email ?? ''} plan={plan} avatarUrl={avatarUrl} />
      {/* UX-02: pt-12 macht Platz für die mobile Topbar, md:pt-0 + md:pl-[220px]
          für die feste Sidebar ab Tablet. */}
      {/* tabular-nums global statt siebenmal opt-in: Proportionalziffern liefen
          ausgerechnet bei den größten, live aktualisierten Werten (Confidence-
          Donut, text-4xl-Stats) und hebelten in der Rohdaten-Tabelle das
          text-right aus, weil eine 1 schmaler ist als eine 8. */}
      <main id="main" className="pt-12 tabular-nums md:pt-0 md:pl-[220px]">
        {children}
      </main>
    </div>
  )
}
