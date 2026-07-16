'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PandaLogo } from '@/components/PandaLogo'
import { useMemo, useState } from 'react'
import {
  LayoutGrid,
  CreditCard,
  Settings,
  FlaskConical,
  ChevronDown,
} from 'lucide-react'

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

type SidebarProps = {
  email: string
  plan: string
}

export function Sidebar({ email, plan }: SidebarProps) {
  const pathname = usePathname()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith('/dashboard/billing') || pathname.startsWith('/dashboard/account')
  )

  const gravatarHash = useMemo(() => {
    let h = 0
    for (let i = 0; i < email.length; i++) {
      const c = email.charCodeAt(i)
      h = ((h << 5) - h) + c
      h |= 0
    }
    return Math.abs(h).toString(16)
  }, [email])

  const gravatarSrc = `https://www.gravatar.com/avatar/${gravatarHash}?d=404&s=40`

  const isActive = (href: string) => pathname === href
  const isInSection = (href: string) => pathname.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[220px] flex-col border-r border-border bg-bg-0">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-3 py-4"
      >
        <PandaLogo className="h-5 w-5 shrink-0 rounded-[5px]" />
        <span className="text-[14px] font-semibold text-text">variante</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2">
        {/* Overview */}
        <SidebarLink
          href="/dashboard"
          icon={LayoutGrid}
          label="Overview"
          active={isActive('/dashboard')}
        />

        {/* Tests */}
        <SidebarLink
          href="/dashboard/tests"
          icon={FlaskConical}
          label="Tests"
          active={isInSection('/dashboard/tests')}
        />

        {/* Divider */}
        <div className="mx-2 my-2 border-t border-border" />

        {/* Settings group */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text cursor-pointer"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Settings</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
              settingsOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {settingsOpen && (
          <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-3">
            <SidebarSubLink
              href="/dashboard/billing"
              icon={CreditCard}
              label="Billing"
              active={isActive('/dashboard/billing')}
            />
            <SidebarSubLink
              href="/dashboard/account"
              icon={Settings}
              label="Account"
              active={isActive('/dashboard/account')}
            />
          </div>
        )}
      </nav>

      {/* Spacer pushes avatar to bottom */}
      <div className="flex-1" />

      {/* Avatar at bottom */}
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/account"
          className="flex items-center gap-2.5 rounded-[6px] p-1.5 transition-colors hover:bg-bg-2"
        >
          {!avatarFailed ? (
            <img
              src={gravatarSrc}
              alt=""
              role="presentation"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                background: `${avatarColor(email)}1f`,
                color: avatarColor(email),
              }}
            >
              {initials(email)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-text leading-tight">
              {email}
            </p>
            <p className="text-[11px] text-text-3 leading-tight">
              {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Agency'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? 'bg-bg-2 font-medium text-text'
          : 'text-text-2 hover:bg-bg-2 hover:text-text'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

function SidebarSubLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors ${
        active
          ? 'bg-bg-2 font-medium text-text'
          : 'text-text-2 hover:bg-bg-2 hover:text-text'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
