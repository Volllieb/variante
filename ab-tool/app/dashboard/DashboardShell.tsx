'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import {
  LogOut,
  FlaskConical,
  Users,
  TrendingUp,
  Zap,
  List,
  BarChart3,
  Globe,
  KeyRound,
  CreditCard,
  Lock,
  Rocket,
  Plug,
  Puzzle,
  ExternalLink,
  Key,
} from 'lucide-react'

/* ── Token palette (brandguidelines.md §2) ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

type DashboardShellProps = {
  email: string
  plan: string
  children: React.ReactNode
}

export function DashboardShell({ email, plan, children }: DashboardShellProps) {
  const router = useRouter()
  const isPro = plan === 'pro' || plan === 'agency'

  async function logout() {
    await getBrowserSupabase().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function billing(path: 'checkout' | 'portal') {
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error')
    } catch {}
  }

  async function changePassword() {
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) alert(error.message)
    else alert('Password reset link sent to your email.')
  }

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-sans)] text-[13px] text-[#ededed]/62 antialiased">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-bg-0/95 px-5 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-[13px] font-medium text-[#ededed]">
          <PandaLogo className="h-6 w-6 rounded-[6px]" />
          variante
        </Link>
        <span className="rounded-[5px] border border-white/[0.18] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#ededed]/40">
          {plan}
        </span>
        <div className="flex-1" />
        <span className="hidden text-[13px] text-[#ededed]/40 sm:block">{email}</span>
        <button
          onClick={logout}
          className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#ededed]/62 transition-colors duration-150 hover:border-white/[0.18] hover:text-[#ededed]"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* ── Sidebar ── */}
        <aside className="sticky top-[49px] hidden h-[calc(100vh-49px)] w-[200px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/10 p-3 md:flex">
          <NavLink icon={FlaskConical} label="Tests" href="/dashboard" />
          <NavLink icon={Rocket} label="Results" state="soon" />
          <NavLink icon={List} label="Activity log" state="soon" />
          <NavLink
            icon={BarChart3}
            label="Analytics"
            state={isPro ? undefined : 'locked'}
            onClick={!isPro ? () => billing('checkout') : undefined}
          />
          <NavLink icon={Globe} label="Domains" state="soon" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={KeyRound} label="Plugin token" anchor="#plugin-token" />
          <NavLink icon={Plug} label="Integrations" state="soon" />
          <NavLink icon={Users} label="Team" state="locked" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={CreditCard} label="Usage" anchor="#usage" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={Puzzle} label="Extension" anchor="#browser-extension" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={Key} label="Change password" onClick={changePassword} />
        </aside>

        {/* ── Page content ── */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function NavLink({
  icon: Icon,
  label,
  href,
  anchor,
  active,
  state,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  anchor?: string
  active?: boolean
  state?: 'soon' | 'locked'
  onClick?: () => void
}) {
  const base = `flex items-center justify-between gap-2 rounded-[6px] px-[9px] py-[7px] text-[13px] transition-colors duration-150 ${
    active ? 'font-medium text-[#ededed]' : 'text-[#ededed]/62 hover:text-[#ededed]/85'
  }`
  const style = active ? { background: T.bg2 } : undefined
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {state === 'soon' && (
        <span className="shrink-0 rounded-[5px] border border-white/10 px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-[#ededed]/30">
          Soon
        </span>
      )}
      {state === 'locked' && <Lock className="h-3 w-3 shrink-0 text-[#ededed]/40" />}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={base} style={style}>
        {content}
      </Link>
    )
  }
  if (anchor) {
    return (
      <a href={anchor} className={base} style={style}>
        {content}
      </a>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} cursor-pointer text-left`} style={style}>
        {content}
      </button>
    )
  }
  return (
    <div className={`${base} cursor-default text-[#ededed]/40`} style={style}>
      {content}
    </div>
  )
}
