'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Check, FlaskConical, Award, AlertTriangle, X } from 'lucide-react'
import { Tooltip } from './Tooltip'

/* ── Types ── */
export type Notification = {
  id: string
  type: 'test_done' | 'significance' | 'warning' | 'tip'
  title: string
  body: string
  href?: string
  read: boolean
  createdAt: Date
}

const iconMap = {
  test_done: FlaskConical,
  significance: Award,
  warning: AlertTriangle,
  tip: Check,
}

const colorMap = {
  test_done: { bg: 'bg-[#2fd76c]/10', text: 'text-[#2fd76c]' },
  significance: { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]' },
  warning: { bg: 'bg-[#f5455c]/10', text: 'text-[#f5455c]' },
  tip: { bg: 'bg-white/5', text: 'text-[#ededed]/60' },
}

/* ── Demo notifications (seed data) ── */
function seedNotifications(): Notification[] {
  return [
    {
      id: 'seed-1',
      type: 'test_done',
      title: 'Test completed',
      body: '"Hero CTA" reached significance — Variant B won with +32% uplift.',
      read: false,
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'seed-2',
      type: 'significance',
      title: 'Almost there',
      body: '"Pricing headline" is at 92% significance. ~200 more visitors needed.',
      read: false,
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: 'seed-3',
      type: 'tip',
      title: 'Pro tip',
      body: 'You can filter tests by status — click the filter icon in your test list.',
      read: true,
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  ]
}

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem('variante-notifications')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.map((n: Record<string, unknown>) => ({ ...n, createdAt: new Date(n.createdAt as string) }))
      } catch {
        return seedNotifications()
      }
    }
    return seedNotifications()
  })
  const ref = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => !n.read).length

  // Persist
  useEffect(() => {
    localStorage.setItem('variante-notifications', JSON.stringify(notifications))
  }, [notifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Tooltip content="Notifications">
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[#ededed]/50 transition-colors hover:bg-[#111111] hover:text-[#ededed]/80"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#f5455c] px-1 text-[9px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-[10px] border border-white/10 bg-[#0a0a0a] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <span className="text-[12px] font-semibold text-[#ededed]">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="cursor-pointer text-[11px] text-[#ededed]/50 hover:text-[#ededed]"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="cursor-pointer text-[11px] text-[#ededed]/50 hover:text-[#f5455c]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-6 w-6 text-[#ededed]/20" />
                <p className="text-[12px] text-[#ededed]/40">All caught up!</p>
              </div>
            ) : (
              notifications
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map((n) => {
                  const Icon = iconMap[n.type]
                  const c = colorMap[n.type]
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2.5 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0 transition-colors hover:bg-[#111111] ${n.read ? 'opacity-60' : ''}`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${c.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-[#ededed] truncate">{n.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/50 line-clamp-2">{n.body}</p>
                        <p className="mt-1 text-[10px] text-[#ededed]/30">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2fd76c]" title="Unread" />
                      )}
                    </div>
                  )
                })
              )}
          </div>
        </div>
      )}
    </div>
  )
}
