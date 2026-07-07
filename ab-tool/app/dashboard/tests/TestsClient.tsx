'use client'

import { useMemo, useState } from 'react'
import { NewTestFlow } from '../NewTestFlow'
import { TestCard, type TestRow } from '../components/TestCard'
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

const STATUS_FILTERS = ['all', 'active', 'draft', 'done'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

export function TestsClient({
  apiToken,
  tests,
  hasFigmaPlugin,
  isAtFreeLimit,
}: {
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
  isAtFreeLimit: boolean
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
          isAtFreeLimit={isAtFreeLimit}
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
