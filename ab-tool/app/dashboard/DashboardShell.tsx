'use client'

import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import {
  FlaskConical,
  LayoutGrid,
  KeyRound,
  Code2,
  CreditCard,
  Settings,
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

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#2fd76c', '#f5a623', '#f5455c', '#ededed']
  return colors[Math.abs(hash) % colors.length]
}

function initials(email: string): string {
  const [name] = email.split('@')
  return name.slice(0, 2).toUpperCase()
}

export function DashboardShell({ email, plan, children }: DashboardShellProps) {

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-sans)] text-[13px] text-[#ededed]/62 antialiased">
      <div className="flex">
        {/* ── Sidebar — full height, edge to edge ── */}
        <aside className="sticky top-0 flex h-screen w-[200px] shrink-0 flex-col border-r border-white/10 p-3">
          {/* Logo + plan pill */}
          <Link href="/dashboard" className="mb-1.5 flex items-center gap-2 px-[9px] py-1.5">
            <PandaLogo className="h-6 w-6 rounded-[6px]" />
            <span className="text-[13px] font-medium text-[#ededed]">variante</span>
          </Link>
          <span className="mb-3 ml-[9px] self-start rounded-[5px] border border-white/[0.18] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#ededed]/40">
            {plan}
          </span>

          {/* Nav — main pages */}
          <nav className="flex flex-col gap-0.5">
            <NavLink icon={FlaskConical} label="Overview" href="/dashboard" />
            <NavLink icon={LayoutGrid} label="Tests" href="/dashboard/tests" />
          </nav>

          {/* Nav — setup tools */}
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <p className="mb-1.5 px-[9px] text-[10px] font-semibold uppercase tracking-wider text-[#ededed]/30">Setup</p>
            <nav className="flex flex-col gap-0.5">
              <NavLink icon={KeyRound} label="Plugin & Extension" anchor="#plugin-token" />
              <NavLink icon={Code2} label="Snippet" anchor="#snippet" />
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Nav — account (bottom) */}
          <nav className="flex flex-col gap-0.5 border-t border-white/[0.06] pt-3">
            <NavLink icon={CreditCard} label="Billing" href="/dashboard/billing" />
            <NavLink icon={Settings} label="Account" href="/dashboard/account" />
          </nav>

          {/* Profile — bottom of sidebar */}
          <Link
            href="/dashboard/account"
            className="flex items-center gap-2.5 rounded-[6px] p-[7px] transition-colors duration-150 hover:bg-[#111111]"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ background: `${avatarColor(email)}1f`, color: avatarColor(email) }}
            >
              {initials(email)}
            </div>
            <span className="truncate text-[11px] font-medium text-[#ededed]/62">{email}</span>
          </Link>
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
