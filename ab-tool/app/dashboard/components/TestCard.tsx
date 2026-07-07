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

function testDuration(iso: string, status: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  const dur = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : `${mins}m`

  if (status === 'active') return `Running for ${dur}`
  if (status === 'paused') return `Paused · Ran for ${dur}`
  if (status === 'done') return `Completed · Ran for ${dur}`
  return `Draft · Created ${dur} ago`
}

/* ── 24×24 Mini-Donut ── */
function SigDonut({ significance, size }: { significance: number; size: number }) {
  const r = 9
  const c = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, significance))
  const strokeColor = pct >= 0.95 ? T.ok : pct >= 0.7 ? T.pro : '#ffffff40'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      {pct >= 0.95 && (
        <text x={c} y={c + 0.5} textAnchor="middle" fontSize="8" fontWeight="700" fill={T.ok}>
          ✓
        </text>
      )}
      {pct < 0.95 && pct >= 0.7 && (
        <text x={c} y={c + 0.5} textAnchor="middle" fontSize="7" fontWeight="600" fill={T.pro}>
          {Math.round(pct * 100)}
        </text>
      )}
    </svg>
  )
}

export function TestCard({
  t,
  highlight,
  onDelete,
}: {
  t: TestRow
  highlight?: boolean
  onDelete?: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState(t.status)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
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
  const uplift = crA > 0 ? ((crB - crA) / crA) * 100 : null
  const totalV = va + vb
  const pctA = totalV > 0 ? (va / totalV) * 100 : 50
  const sig = totalV > 0 ? calcSignificance(va, ca, vb, cb) : 0
  const domain = extractDomain(t.site_url)

  const status = localStatus

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

  return (
    <Link
      href={`/dashboard/results/${t.id}`}
      className="group/card relative block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5 transition-colors hover:border-white/[0.18]"
      style={highlight ? { animation: 'testPulse 2s ease-out' } : undefined}
    >
      {/* Header row: favicon + name/url + menu */}
      <div className="flex items-start gap-2.5">
        {/* Favicon */}
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=48`}
            alt=""
            width={20}
            height={20}
            className="mt-0.5 shrink-0 rounded-[4px]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-white/[0.04]">
            <span className="text-[9px] text-[#ededed]/30">WWW</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-[#ededed]">{t.name}</p>
          {t.site_url && <p className="mt-0.5 truncate text-[11px] text-[#ededed]/40">{t.site_url}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Significance mini-donut */}
          {totalV > 0 && status !== 'draft' && <SigDonut significance={sig} size={24} />}

          {/* Status dot */}
          <StatusDot status={status} winner={t.winner} />

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={openMenu}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px] text-[#ededed]/30 opacity-0 transition-all hover:bg-white/[0.06] hover:text-[#ededed]/62 group-hover/card:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-1 w-40 rounded-[8px] border border-white/10 bg-[#111111] py-1 shadow-lg shadow-black/40"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {/* Pause / Resume */}
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

                {/* Delete */}
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

      {/* Duration + uplift badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] text-[#ededed]/40">{testDuration(t.created_at, status)}</span>
        {uplift !== null && uplift !== 0 && (
          <span
            className="rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold"
            style={
              uplift > 0
                ? { background: `${T.ok}1f`, color: T.ok }
                : { background: `${T.err}1f`, color: T.err }
            }
          >
            {uplift > 0 ? '+' : ''}{uplift.toFixed(1)}%
          </span>
        )}
        {t.winner === 'B' && (
          <span className="rounded-[5px] bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-semibold text-[#ededed]/62">
            Winner
          </span>
        )}
      </div>

      {/* Visitor split bar */}
      {totalV > 0 && (
        <div className="mt-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="bg-white/30 transition-all" style={{ width: `${pctA}%` }} />
            <div className="bg-white transition-all" style={{ width: `${100 - pctA}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#ededed]/40">
            <span>
              A: {va.toLocaleString()}
              {crA > 0 && <span className="ml-1 text-[#ededed]/62">{(crA * 100).toFixed(1)}% CR</span>}
            </span>
            <span>
              {crB > 0 && <span className="mr-1 text-[#ededed]/62">{(crB * 100).toFixed(1)}% CR</span>}
              B: {vb.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </Link>
  )
}

export function StatusDot({ status, winner }: { status: string; winner?: string | null }) {
  if (status === 'active') {
    return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.ok }} />
  }
  if (status === 'paused') {
    return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.pro }} />
  }
  if (status === 'done' || winner) {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-[#ededed]/40" />
  }
  return <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-[#ededed]/40" />
}
