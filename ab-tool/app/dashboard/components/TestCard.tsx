'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pause, Play, Trash2, Pencil, Check, X } from 'lucide-react'
import { calcSignificance } from '@/lib/significance'

// SVG-Farben (dynamisch, nicht über Tailwind abbildbar)
const SIG_COLORS = { ok: '#2fd76c', pro: '#f5a623', err: '#f5455c', neutral: '#ffffff26' }

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
  /** Gesetzt, wenn der Test aus dem Hybrid-Onboarding stammt (Preview vor Sign-up). */
  preview_variant_screenshot_url?: string | null
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
  const strokeColor = pct >= 0.95 ? SIG_COLORS.ok : pct >= 0.7 ? SIG_COLORS.pro : SIG_COLORS.neutral
  const bgColor = pct >= 0.95 ? `${SIG_COLORS.ok}1f` : pct >= 0.7 ? `${SIG_COLORS.pro}1f` : '#ffffff0d'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill={bgColor} stroke="rgba(255,255,255,.06)" strokeWidth="1.5" />
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
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="#ededed">
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
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(t.name)
  const [localName, setLocalName] = useState(t.name)
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

  async function handleRename(e: React.SyntheticEvent) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === localName) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tests/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) setLocalName(trimmed)
    } catch { /* silently fail */ }
    setBusy(false)
    setRenameOpen(false)
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
      className="group/card relative block rounded-[10px] border border-border bg-bg-1 p-2.5 transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-text/20 focus-visible:outline-none"
      style={highlight ? { animation: 'testPulse 2s ease-out' } : undefined}
    >
      {/* Live-Pulse: subtile Signatur für aktive Tests */}
      {status === 'active' && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-ok motion-safe:animate-pulse" />
      )}

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
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-bg-2">
            <span className="text-[10px] text-text-3/60">WWW</span>
          </div>
        )}

        {/* Name + URL (or rename input) */}
        <div className="min-w-0 flex-1">
          {renameOpen ? (
            <div className="flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(e); else if (e.key === 'Escape') { setRenameOpen(false); setRenameValue(localName) } }}
                autoFocus
                className="flex-1 rounded-[4px] border border-border bg-bg-0 px-2 py-1 text-[12px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong"
              />
              <button onClick={handleRename} disabled={busy} className="cursor-pointer rounded-[4px] p-1 text-text-3 hover:text-text">
                <Check className="h-3 w-3" />
              </button>
              <button onClick={() => { setRenameOpen(false); setRenameValue(localName) }} className="cursor-pointer rounded-[4px] p-1 text-text-3 hover:text-text">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <p className="truncate text-[13px] font-medium text-text">{localName}</p>
              {t.site_url && (
                <p className="mt-0.5 truncate text-[10px] text-text-3">{t.site_url}</p>
              )}
            </>
          )}
        </div>

        {/* Pie chart + menu */}
        <div className="flex shrink-0 items-center gap-1">
          {totalV > 0 && isLive && <SigPie significance={sig} visitors={totalV} size={40} />}

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={openMenu}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Test actions"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[5px] text-text-3 transition-all hover:bg-bg-2 hover:text-text-2 focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-40 rounded-[8px] border border-border bg-bg-2 py-1">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameOpen(true); setMenuOpen(false) }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-bg-1 hover:text-text"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>

                {(status === 'active' || status === 'paused') && (
                  <button
                    onClick={togglePause}
                    disabled={busy}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-bg-1 hover:text-text disabled:opacity-40"
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
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-bg-1 hover:text-text disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteConfirm ? 'Click to confirm' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 1b: CR + Lift (nur bei aktiven/pausierten Tests mit Daten) ── */}
      {isLive && totalV > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <span className="text-text-3">
            A <strong className="text-text-2">{(crA * 100).toFixed(1)}%</strong>
          </span>
          <span className="text-text-3">·</span>
          <span className="text-text-3">
            B <strong className="text-text-2">{(crB * 100).toFixed(1)}%</strong>
          </span>
          {crA > 0 && (() => {
            const l = ((crB - crA) / crA) * 100
            if (Math.abs(l) < 0.1) return null
            return (
              <>
                <span className="text-text-3">·</span>
                <span className={l > 0 ? 'text-ok' : 'text-err'}>
                  {l > 0 ? '+' : ''}{l.toFixed(1)}%
                </span>
              </>
            )
          })()}
        </div>
      )}

      {/* ── Row 2: status pill | health | duration | leader | winner ── */}
      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
        {/* Status pill */}
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px]',
            status === 'active' ? 'text-ok' : status === 'paused' ? 'text-pro' : 'text-text-2',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
              status === 'active' ? 'bg-ok' :
              status === 'paused' ? 'bg-pro' :
              t.winner === 'B' ? 'bg-ok' : 'bg-text-3',
            ].join(' ')}
          />
          {status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : status === 'done' ? 'Done' : 'Draft'}
        </span>

        {/* Health issues pill */}
        {t.health_status === 'issues' && Array.isArray(t.health_issues) && t.health_issues.length > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-err/20 bg-err/[0.05] px-2 py-0.5 text-[11px] text-err"
            title={t.health_issues.map(code => issueLabel(code)).join(', ')}
          >
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-err" />
            {t.health_issues.length} {t.health_issues.length === 1 ? 'issue' : 'issues'}
          </span>
        )}

        {/* Duration pill */}
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-3">
          {formatDuration(t.created_at)}
        </span>

        {/* Variant leader pill */}
        {leader && isLive && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-2">
            Variant {leader}
          </span>
        )}

        {/* Winner badge */}
        {t.winner === 'B' && status === 'done' && (
          <span className="rounded-full border border-ok/20 bg-ok-bg px-2 py-0.5 text-[11px] font-semibold text-ok">
            Winner
          </span>
        )}
      </div>
    </Link>
  )
}

