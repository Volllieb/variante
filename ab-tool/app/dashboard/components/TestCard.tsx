'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react'
import { calcSignificance } from '@/lib/significance'

/* ── Token palette ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

export type TestRow = {
  id: string
  name: string
  site_url: string | null
  status: string
  health_status?: string | null
  health_issues?: string[] | null
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
  winner: string | null
  created_at: string
}

function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname
  } catch {
    return null
  }
}

function formatDuration(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (days >= 1) return `${days}d`
  if (hours >= 1) return `${hours}h`
  if (mins >= 1) return `${mins}m`
  return `${secs}s`
}

function issueLabel(code: string): string {
  const labels: Record<string, string> = {
    missing_name: 'No name',
    missing_site_url: 'No website',
    missing_selector: 'No element selected',
    missing_variant: 'No variant design',
    missing_goal: 'No conversion goal',
  }
  return labels[code] ?? code
}

/* ── Pie chart: significance progress, visitors in center ── */
function SigPie({ significance, visitors, size }: { significance: number; visitors: number; size: number }) {
  const r = size / 2 - 3
  const c = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, significance))
  const strokeColor = pct >= 0.95 ? T.ok : pct >= 0.7 ? T.pro : '#ffffff26'
  const bgColor = pct >= 0.95 ? `${T.ok}1f` : pct >= 0.7 ? `${T.pro}1f` : '#ffffff0d'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Background circle */}
      <circle cx={c} cy={c} r={r} fill={bgColor} stroke="rgba(255,255,255,.06)" strokeWidth="1.5" />
      {/* Progress arc */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Center text: visitor count */}
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={T.text}>
        {visitors >= 1000 ? `${(visitors / 1000).toFixed(0)}k` : visitors}
      </text>
    </svg>
  )
}

export function TestCard({
  t,
  highlight,
  onDelete,
  from,
}: {
  t: TestRow
  highlight?: boolean
  onDelete?: (id: string) => void
  from?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState(t.status)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const va = t.visitors_a ?? 0
  const vb = t.visitors_b ?? 0
  const ca = t.conversions_a ?? 0
  const cb = t.conversions_b ?? 0
  const crA = va > 0 ? ca / va : 0
  const crB = vb > 0 ? cb / vb : 0
  const totalV = va + vb
  const sig = totalV > 0 ? calcSignificance(va, ca, vb, cb) : 0
  const domain = extractDomain(t.site_url)
  const status = localStatus

  // Variant leader
  const leadA = crA > crB
  const leadB = crB > crA
  const leader = leadB ? 'B' : leadA ? 'A' : null

  async function togglePause(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const newStatus = status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/tests/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) setLocalStatus(newStatus)
    } catch { /* silently fail */ }
    setBusy(false)
    setMenuOpen(false)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tests/${t.id}?confirm=true`, { method: 'DELETE' })
      if (res.ok) onDelete?.(t.id)
    } catch { /* silently fail */ }
    setBusy(false)
    setMenuOpen(false)
  }

  function openMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirm(false)
    setMenuOpen((o) => !o)
  }

  const isLive = status === 'active' || status === 'paused'

  return (
    <Link
      href={`/dashboard/results/${t.id}${from ? `?from=${from}` : ''}`}
      className="group/card relative block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5 transition-colors hover:border-white/[0.18]"
      style={highlight ? { animation: 'testPulse 2s ease-out' } : undefined}
    >
      {/* ── Row 1: favicon | name+url | pie chart ── */}
      <div className="flex items-center gap-2.5">
        {/* Favicon */}
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=48`}
            alt=""
            width={18}
            height={18}
            className="shrink-0 rounded-[4px]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-white/[0.04]">
            <span className="text-[8px] text-[#ededed]/40">WWW</span>
          </div>
        )}

        {/* Name + URL */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-[#ededed]">{t.name}</p>
          {t.site_url && (
            <p className="mt-0.5 truncate text-[11px] text-[#ededed]/40">{t.site_url}</p>
          )}
        </div>

        {/* Pie chart + menu */}
        <div className="flex shrink-0 items-center gap-1">
          {totalV > 0 && isLive && <SigPie significance={sig} visitors={totalV} size={40} />}

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={openMenu}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px] text-[#ededed]/40 transition-all hover:bg-white/[0.06] hover:text-[#ededed]/70"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-1 w-40 rounded-[8px] border border-white/10 bg-[#111111] py-1 shadow-lg shadow-black/40"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {(status === 'active' || status === 'paused') && (
                  <button
                    onClick={togglePause}
                    disabled={busy}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-[#ededed]/80 transition-colors hover:bg-white/[0.04] hover:text-[#ededed] disabled:opacity-40"
                  >
                    {status === 'active' ? (
                      <><Pause className="h-3.5 w-3.5" /> Pause</>
                    ) : (
                      <><Play className="h-3.5 w-3.5" /> Resume</>
                    )}
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-[#ededed]/80 transition-colors hover:bg-white/[0.04] hover:text-[#ededed] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteConfirm ? 'Click to confirm' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: status pill | duration | variant leader ── */}
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        {/* Status pill */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[11px]"
          style={{ color: status === 'active' ? T.ok : status === 'paused' ? T.pro : '#ededed' }}
        >
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background:
                status === 'active' ? T.ok :
                status === 'paused' ? T.pro :
                t.winner === 'B' ? T.ok : '#ffffff33',
            }}
          />
          {status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : status === 'done' ? 'Done' : 'Draft'}
        </span>

        {/* Health issues pill */}
        {t.health_status === 'issues' && Array.isArray(t.health_issues) && t.health_issues.length > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            style={{ borderColor: `${T.err}30`, color: T.err, background: `${T.err}0d` }}
            title={t.health_issues.map(code => issueLabel(code)).join(', ')}
          >
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.err }} />
            {t.health_issues.length} {t.health_issues.length === 1 ? 'issue' : 'issues'}
          </span>
        )}

        {/* Duration pill */}
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[#ededed]/50">
          {formatDuration(t.created_at)}
        </span>

        {/* Variant leader pill */}
        {leader && isLive && (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-[#ededed]/70">
            Variant {leader}
          </span>
        )}

        {/* Winner badge */}
        {t.winner === 'B' && status === 'done' && (
          <span className="rounded-full border border-[#2fd76c]/20 bg-[#2fd76c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2fd76c]">
            Winner
          </span>
        )}
      </div>
    </Link>
  )
}

export function StatusDot({ status, winner }: { status: string; winner?: string | null }) {
  if (winner === 'B' && status === 'done') {
    return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: T.ok }} title="Winner" />
  }
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{
        background:
          status === 'active' ? T.ok :
          status === 'paused' ? T.pro : '#ffffff33',
      }}
      title={status}
    />
  )
}
