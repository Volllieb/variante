'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Check, FlaskConical, Award, AlertTriangle } from 'lucide-react'
import { Tooltip } from './Tooltip'

/* ── Types ── */
export type Notification = {
  id: string
  type: 'test_done' | 'significance' | 'warning' | 'tip'
  title: string
  body: string
  href?: string
  read: boolean
  created_at: string
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

function isNewer(a: Notification, b: Notification): boolean {
  return new Date(a.created_at).getTime() > new Date(b.created_at).getTime()
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('variante-notifications')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : []
    } catch {
      return []
    }
  })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSeenRef = useRef<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => !n.read).length

  // ── Poll server for new notifications ──
  const pollServer = useCallback(async () => {
    try {
      const params = new URLSearchParams({ unread: '1', limit: '50' })
      if (lastSeenRef.current) params.set('since', lastSeenRef.current)
      const res = await fetch(`/api/notifications?${params.toString()}`)
      if (!res.ok) return
      const { notifications: serverNotes } = await res.json()
      if (!serverNotes || serverNotes.length === 0) return

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const fresh = (serverNotes as Notification[]).filter((n) => !existingIds.has(n.id))
        if (fresh.length === 0) return prev
        // Update lastSeenRef so next poll only gets newer notifications
        const newest = fresh.reduce((a, b) => isNewer(a, b) ? a : b, fresh[0])
        const newestTs = new Date(newest.created_at).getTime()
        if (!lastSeenRef.current || newestTs > new Date(lastSeenRef.current).getTime()) {
          lastSeenRef.current = newest.created_at
        }
        return [...fresh, ...prev]
      })
    } catch {
      // silent — polling is best-effort
    }
  }, [])

  // ── Load from server on mount, then poll every 60s ──
  useEffect(() => {
    // Initial server fetch — merges with localStorage cache (loaded via lazy initializer)
    fetch('/api/notifications?limit=50')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.notifications) {
          setNotifications((prev) => {
            const serverIds = new Set((json.notifications as Notification[]).map((n: Notification) => n.id))
            const localOnly = prev.filter((n) => !serverIds.has(n.id))
            return [...localOnly, ...json.notifications]
          })
        }
      })
      .catch(() => {})

    // Poll every 60 seconds
    pollRef.current = setInterval(pollServer, 60_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pollServer])

  // ── Persist to localStorage (cache for next mount) ──
  useEffect(() => {
    try {
      // Nur die neuesten 50 persistieren
      const toPersist = [...notifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)
      localStorage.setItem('variante-notifications', JSON.stringify(toPersist))
    } catch {
      // Safari Private Mode wirft QuotaExceededError
    }
  }, [notifications])

  // ── Close on outside click ──
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch { /* silent */ }
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    try { localStorage.removeItem('variante-notifications') } catch { /* noop */ }
  }, [])

  // ── Render ──
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
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute left-0 bottom-full z-50 mb-1.5 w-80 rounded-[10px] border border-white/10 bg-[#0a0a0a] shadow-xl">
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
              [...notifications]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((n) => {
                  const Icon = iconMap[n.type]
                  const c = colorMap[n.type]
                  const content = (
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
                        <p className="mt-1 text-[10px] text-[#ededed]/30">{timeAgo(new Date(n.created_at))}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2fd76c]" title="Unread" />
                      )}
                    </div>
                  )

                  if (n.href) {
                    return (
                      <a key={n.id} href={n.href} className="block" onClick={() => setOpen(false)}>
                        {content}
                      </a>
                    )
                  }
                  return content
                })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
