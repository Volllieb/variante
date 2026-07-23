import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Sidebar } from './Sidebar'

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
      <Sidebar email={user.email ?? ''} plan={plan} avatarUrl={avatarUrl} />
      {/* UX-02: pt-12 macht Platz für die mobile Topbar, md:pt-0 + md:pl-[220px]
          für die feste Sidebar ab Tablet. */}
      <main id="main" className="pt-12 md:pt-0 md:pl-[220px]">
        {children}
      </main>
    </div>
  )
}
