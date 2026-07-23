'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PandaLogo } from '@/components/PandaLogo'
import { NotificationCenter } from '@/app/components/NotificationCenter'
import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import {
  LayoutGrid,
  CreditCard,
  FlaskConical,
  ChevronDown,
  LogOut,
  User,
  BookOpen,
  Menu,
  X,
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
  avatarUrl: string | null
}

export function Sidebar({ email, plan, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const prevAvatarUrl = useRef(avatarUrl)

  // Reset load-failed state when avatar URL changes (e.g. user uploads new one)
  useEffect(() => {
    if (avatarUrl !== prevAvatarUrl.current) {
      setAvatarLoadFailed(false)
      prevAvatarUrl.current = avatarUrl
    }
  }, [avatarUrl])

  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // UX-02: Auf Mobile ist die Sidebar ein Off-Canvas-Drawer. Vorher war sie
  // fest fixed w-[220px] ohne Breakpoint — auf 375px blieben 155px fuer den
  // gesamten Content, mit horizontalem Overflow.
  const [mobileOpen, setMobileOpen] = useState(false)

  // Bei jedem Routenwechsel den mobilen Drawer schliessen — im Render anhand
  // des vorigen Pfads abgeleitet statt per Effect (sonst ein Extra-Render und
  // die react-hooks/set-state-in-effect-Warnung).
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    if (mobileOpen) setMobileOpen(false)
  }

  // Escape schliesst den mobilen Drawer.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Click outside closes popover
  useEffect(() => {
    if (!popoverOpen) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])

  const isActive = (href: string) => pathname === href
  const isInSection = (href: string) => pathname.startsWith(href)

  return (
    <>
      {/* Mobile-Topbar mit Hamburger — nur unter md */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-bg-0 px-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="dashboard-sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <PandaLogo size="sm" />
          <span className="text-[14px] font-semibold text-text">variante</span>
        </Link>
      </div>

      {/* Backdrop — nur mobil, wenn offen */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[220px] flex-col border-r border-border bg-bg-0 transition-transform duration-200 md:z-30 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close-Button im Drawer — nur mobil */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute right-2 top-3 flex h-7 w-7 items-center justify-center rounded-[6px] text-text-3 transition-colors hover:bg-bg-2 hover:text-text md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-3 py-4"
      >
        <PandaLogo size="sm" />
        <span className="text-[14px] font-semibold text-text">variante</span>
      </Link>

      {/* Navigation */}
      <nav aria-label="Main" className="flex flex-col gap-0.5 px-2">
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

        {/* Docs */}
        <SidebarLink
          href="/docs"
          icon={BookOpen}
          label="Docs"
          active={false}
        />

      </nav>

      {/* Spacer pushes avatar to bottom */}
      <div className="flex-1" />

      {/* Bottom bar: notifications + avatar */}
      <div className="relative border-t border-border p-3" ref={popoverRef}>
        <div className="mb-1.5">
          <NotificationCenter />
        </div>
        <button
          onClick={() => setPopoverOpen((v) => !v)}
          aria-expanded={popoverOpen}
          aria-controls="sidebar-account-popover"
          aria-haspopup="menu"
          className="flex w-full items-center gap-2.5 rounded-[6px] p-1.5 text-left transition-colors hover:bg-bg-2 cursor-pointer"
        >
          {avatarUrl && !avatarLoadFailed ? (
            <Image
              src={avatarUrl}
              alt=""
              role="presentation"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
              onError={() => setAvatarLoadFailed(true)}
              unoptimized
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
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-text-3 transition-transform ${
              popoverOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Popover */}
        {popoverOpen && (
          <div id="sidebar-account-popover" role="menu" className="absolute bottom-full left-3 right-3 mb-1 rounded-[8px] border border-border bg-bg-1 p-1">
            <Link
              href="/dashboard/account"
              onClick={() => setPopoverOpen(false)}
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text"
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Account settings</span>
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={() => setPopoverOpen(false)}
              className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text"
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Billing</span>
            </Link>
            <button
              onClick={async () => {
                await getBrowserSupabase().auth.signOut()
                window.location.href = '/'
              }}
              className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
      </aside>
    </>
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
      className={`relative flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? 'bg-bg-2 font-medium text-text'
          : 'text-text-2 hover:bg-bg-2 hover:text-text'
      }`}
    >
      {/* Aktiver Seiten-Indikator: subtiler linker Balken */}
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-text" />}
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}


