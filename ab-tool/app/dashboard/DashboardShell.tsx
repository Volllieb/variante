'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PandaLogo } from '@/components/PandaLogo'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { NotificationCenter } from '@/app/components/NotificationCenter'
import { Tooltip } from '@/app/components/Tooltip'
import {
  FlaskConical,
  LayoutGrid,
  CreditCard,
  Settings,
  HeartPulse,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const T = {
  bg2: '#111111',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#2fd76c', '#f5a623', '#f5455c', '#60a5fa']
  return colors[Math.abs(hash) % colors.length]
}

function initials(email: string): string {
  const [name] = email.split('@')
  return name.slice(0, 2).toUpperCase()
}

type DashboardShellProps = {
  email: string
  plan: string
  children: React.ReactNode
}

export function DashboardShell({ email, plan, children }: DashboardShellProps) {
  const pathname = usePathname()
  const [avatarFailed, setAvatarFailed] = useState(false)

  const gravatarHash = useMemo(() => {
    let h = 0
    for (let i = 0; i < email.length; i++) {
      const c = email.charCodeAt(i)
      h = ((h << 5) - h) + c
      h |= 0
    }
    return Math.abs(h).toString(16)
  }, [email])

  const gravatarSrc = `https://www.gravatar.com/avatar/${gravatarHash}?d=404&s=56`

  return (
    <div className="min-h-screen bg-bg-0 font-[family-name:var(--font-sans)] text-[13px] antialiased">
      {/* ── Top Nav Bar ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg-0/80 backdrop-blur-md">
        <div className="flex h-11 items-center gap-1 px-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 px-1.5 mr-2">
            <PandaLogo className="h-5 w-5 rounded-[5px]" />
            <span className="text-[13px] font-semibold text-text hidden sm:inline">variante</span>
          </Link>

          {/* Plan pill */}
          {plan !== 'free' && (
            <span className="rounded-[5px] border border-border-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-3 mr-1">
              {plan}
            </span>
          )}

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            <TopNavLink icon={FlaskConical} label="Overview" href="/dashboard" active={pathname === '/dashboard'} />
            <TopNavLink icon={LayoutGrid} label="Tests" href="/dashboard/tests" active={pathname.startsWith('/dashboard/tests')} />
            <TopNavLink icon={HeartPulse} label="Setup" href="/dashboard/setup" active={pathname === '/dashboard/setup'} />
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right-side actions */}
          <div className="flex items-center gap-0.5">
            <Tooltip content="Billing">
              <Link
                href="/dashboard/billing"
                className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ${
                  pathname === '/dashboard/billing'
                    ? 'bg-bg-2 text-text'
                    : 'text-text-3 hover:bg-bg-2 hover:text-text/80'
                }`}
              >
                <CreditCard className="h-4 w-4" />
              </Link>
            </Tooltip>

            <Tooltip content="Account settings">
              <Link
                href="/dashboard/account"
                className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ${
                  pathname === '/dashboard/account'
                    ? 'bg-bg-2 text-text'
                    : 'text-text-3 hover:bg-bg-2 hover:text-text/80'
                }`}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </Tooltip>

            <NotificationCenter />
            <ThemeToggle />

            {/* Avatar */}
            <Tooltip content={email}>
              <Link
                href="/dashboard/account"
                className="ml-1 flex items-center gap-2 rounded-[6px] p-0.5 transition-colors hover:bg-bg-2"
              >
                {!avatarFailed ? (
                  <img
                    src={gravatarSrc}
                    alt=""
                    role="presentation"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ background: `${avatarColor(email)}1f`, color: avatarColor(email) }}
                  >
                    {initials(email)}
                  </div>
                )}
              </Link>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      {children}
    </div>
  )
}

function TopNavLink({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors ${
        active
          ? 'bg-bg-2 font-medium text-text'
          : 'text-text-3 hover:bg-bg-2 hover:text-text/70'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
