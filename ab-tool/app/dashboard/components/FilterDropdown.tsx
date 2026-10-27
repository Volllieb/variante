'use client'

import { Filter, X } from 'lucide-react'

import { Button } from '@/app/components'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'

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

/**
 * Filter-Menü (brandguidelines v3 §6.8).
 *
 * Phase 2: lag als handgebautes Panel hier — eigener Klick-außerhalb-Listener,
 * eigener Esc-Handler, ein `role="listbox"` mit drei unabhängigen Gruppen
 * darin (das ist keine Listbox) und ein handgebauter Icon-Button. Das macht
 * jetzt Radix über <DropdownMenu>, die Gruppen sind drei echte Radio-Gruppen,
 * und der Auslöser ist <Button size="icon-lg"> (36px, auf Toolbar-Höhe).
 *
 * `onSelect` wird pro Option abgefangen: ein Filter-Menü mit drei Gruppen soll
 * sich nicht nach dem ersten Klick schließen.
 */
export function FilterDropdown({
  filter,
  onChange,
}: {
  filter: FilterState
  onChange: (f: FilterState) => void
}) {
  const activeCount = getActiveFilterCount(filter)

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filter, [key]: value })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon-lg"
          className="relative bg-bg-0"
          aria-label={`Filter${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-pro px-1 text-meta font-semibold leading-none text-text-on-invert">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filter.status}
          onValueChange={(v) => set('status', v as StatusFilter)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt} onSelect={(e) => e.preventDefault()}>
              {STATUS_LABELS[opt]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Created</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filter.date}
          onValueChange={(v) => set('date', v as DateFilter)}
        >
          {DATE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt} onSelect={(e) => e.preventDefault()}>
              {DATE_LABELS[opt]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Winner</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filter.winner}
          onValueChange={(v) => set('winner', v as WinnerFilter)}
        >
          {WINNER_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt} onSelect={(e) => e.preventDefault()}>
              {WINNER_LABELS[opt]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange({ ...DEFAULT_FILTER })}>
              <X className="h-3 w-3" aria-hidden />
              Reset filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
