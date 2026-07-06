'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { NewTestFlow } from '../NewTestFlow'
import {
  Search,
  Plus,
  ListFilter,
  FlaskConical,
} from 'lucide-react'

/* ── Token palette ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

type TestRow = {
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

const STATUS_FILTERS = ['all', 'active', 'draft', 'done'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

export function TestsClient({
  apiToken,
  tests,
  hasFigmaPlugin,
}: {
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [newTestOpen, setNewTestOpen] = useState(false)

  function cycleFilter() {
    setStatusFilter((f) => STATUS_FILTERS[(STATUS_FILTERS.indexOf(f) + 1) % STATUS_FILTERS.length])
  }

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tests.filter((t) => {
      const mq = !q || t.name.toLowerCase().includes(q) || (t.site_url ?? '').toLowerCase().includes(q)
      return mq && (statusFilter === 'all' || t.status === statusFilter)
    })
  }, [tests, query, statusFilter])

  return (
    <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ededed]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find test…"
            className="w-full rounded-[6px] border border-white/10 bg-[#0a0a0a] py-1.5 pl-8 pr-3 text-[13px] text-[#ededed] placeholder:text-[#ededed]/40 focus:border-white/[0.18] focus:outline-none"
          />
        </div>
        <button
          onClick={cycleFilter}
          title={`Filter: ${statusFilter}`}
          className="relative flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
        >
          <ListFilter className="h-3.5 w-3.5" />
          {statusFilter !== 'all' && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: T.pro }} />
          )}
        </button>
        <button
          onClick={() => setNewTestOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85"
        >
          <Plus className="h-3.5 w-3.5" />
          New test
        </button>
      </div>

      {/* New test flow overlay */}
      {newTestOpen && (
        <NewTestFlow
          apiToken={apiToken}
          currentTestCount={tests.length}
          hasFigmaPlugin={hasFigmaPlugin}
          onClose={() => setNewTestOpen(false)}
        />
      )}

      {/* Empty / No results */}
      {tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/[0.04]">
            <FlaskConical className="h-5 w-5 text-[#ededed]/40" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#ededed]/62">No experiments yet</p>
          <p className="mt-1.5 max-w-xs text-[11px] text-[#ededed]/40">
            Create your first test in the Figma plugin — paste your plugin token below to get started.
          </p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
          <p className="text-[13px] font-medium text-[#ededed]/62">
            {query ? `No tests match "${query}"` : 'No tests in this filter'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTests.map((t) => (
            <TestCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </main>
  )
}

function TestCard({ t }: { t: TestRow }) {
  const va = t.visitors_a ?? 0
  const vb = t.visitors_b ?? 0
  const ca = t.conversions_a ?? 0
  const cb = t.conversions_b ?? 0
  const crA = va > 0 ? ca / va : 0
  const crB = vb > 0 ? cb / vb : 0
  const uplift = crA > 0 ? ((crB - crA) / crA) * 100 : null
  const totalV = va + vb
  const pctA = totalV > 0 ? (va / totalV) * 100 : 50

  return (
    <Link
      href={`/dashboard/results/${t.id}`}
      className="block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5 transition-colors hover:border-white/[0.18]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[#ededed]">{t.name}</p>
          {t.site_url && <p className="mt-0.5 truncate text-[11px] text-[#ededed]/40">{t.site_url}</p>}
        </div>
        <StatusDot status={t.status} winner={t.winner} />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[11px] text-[#ededed]/62">{t.winner === 'B' ? 'B won' : t.status}</span>
        {uplift !== null && uplift !== 0 && (
          <span
            className="rounded-[5px] px-2 py-0.5 text-[11px] font-semibold"
            style={
              uplift > 0
                ? { background: `${T.ok}1f`, color: T.ok }
                : { background: `${T.err}1f`, color: T.err }
            }
          >
            {uplift > 0 ? '+' : ''}
            {uplift.toFixed(1)}%
          </span>
        )}
      </div>

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

function StatusDot({ status, winner }: { status: string; winner?: string | null }) {
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
