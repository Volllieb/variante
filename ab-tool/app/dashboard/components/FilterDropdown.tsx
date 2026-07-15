'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Filter, X, Check } from 'lucide-react'

/* ── Token palette ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

/* ── Filter types ── */

export const STATUS_OPTIONS = ['all', 'active', 'draft', 'paused', 'done', 'health-issues'] as const
export type StatusFilter = (typeof STATUS_OPTIONS)[number]

export const DATE_OPTIONS = ['all', '7d', '30d', '90d'] as const
export type DateFilter = (typeof DATE_OPTIONS)[number]

export const WINNER_OPTIONS = ['all', 'yes', 'inprogress'] as const
export type WinnerFilter = (typeof WINNER_OPTIONS)[number]

export interface FilterState {
  status: StatusFilter
  date: DateFilter
  winner: WinnerFilter
}

export const DEFAULT_FILTER: FilterState = {
  status: 'all',
  date: 'all',
  winner: 'all',
}

const DATE_LABELS: Record<DateFilter, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  done: 'Done',
  'health-issues': 'Health issues',
}

const WINNER_LABELS: Record<WinnerFilter, string> = {
  all: 'All',
  yes: 'Has winner',
  inprogress: 'In progress',
}

/* ── Helpers ── */

export function getDateCutoff(f: DateFilter): number | null {
  if (f === 'all') return null
  const days = f === '7d' ? 7 : f === '30d' ? 30 : 90
  return Date.now() - days * 86400000
}

export function hasActiveFilters(f: FilterState): boolean {
  return f.status !== 'all' || f.date !== 'all' || f.winner !== 'all'
}

export function getActiveFilterCount(f: FilterState): number {
  return [f.status, f.date, f.winner].filter((v) => v !== 'all').length
}

/* ── Component ── */

export function FilterDropdown({
  filter,
  onChange,
}: {
  filter: FilterState
  onChange: (f: FilterState) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeCount = getActiveFilterCount(filter)

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filter, [key]: value })
  }

  function reset() {
    onChange({ ...DEFAULT_FILTER })
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Filter${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
        className="relative flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
      >
        <Filter className="h-3.5 w-3.5" />
        {activeCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none text-black"
            style={{ background: T.pro }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[34px] z-50 w-[220px] rounded-[8px] border border-white/[0.12] p-3 shadow-xl"
          style={{ background: T.bg1 }}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#ededed]/62">Filters</span>
            {activeCount > 0 && (
              <button
                onClick={reset}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-[#ededed]/40 transition-colors hover:text-[#ededed]/80"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Status */}
          <FilterSection label="Status">
            {STATUS_OPTIONS.map((opt) => (
              <FilterOption
                key={opt}
                active={filter.status === opt}
                onClick={() => set('status', opt)}
              >
                {STATUS_LABELS[opt]}
              </FilterOption>
            ))}
          </FilterSection>

          {/* Date */}
          <FilterSection label="Created">
            {DATE_OPTIONS.map((opt) => (
              <FilterOption
                key={opt}
                active={filter.date === opt}
                onClick={() => set('date', opt)}
              >
                {DATE_LABELS[opt]}
              </FilterOption>
            ))}
          </FilterSection>

          {/* Winner */}
          <FilterSection label="Winner" isLast>
            {WINNER_OPTIONS.map((opt) => (
              <FilterOption
                key={opt}
                active={filter.winner === opt}
                onClick={() => set('winner', opt)}
              >
                {WINNER_LABELS[opt]}
              </FilterOption>
            ))}
          </FilterSection>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function FilterSection({
  label,
  children,
  isLast,
}: {
  label: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className={`${isLast ? '' : 'mb-2 border-b border-white/[0.06] pb-2'}`}>
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#ededed]/50">
        {label}
      </span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-[4px] px-2 py-1 text-left text-[12px] transition-colors hover:bg-white/[0.04]"
    >
      <span style={{ color: active ? T.text : '#ededed62' }}>{children}</span>
      {active && <Check className="h-3 w-3 shrink-0" style={{ color: T.ok }} />}
    </button>
  )
}
