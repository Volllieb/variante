'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTestList } from '@/lib/useTestList'
import { NewTestFlow } from '../NewTestFlow'
import { TestCard, type TestRow } from '../components/TestCard'
import {
  FilterDropdown,
} from '../components/FilterDropdown'
import {
  Search,
  RefreshCw,
  Plus,
  FlaskConical,
  HeartPulse,
  Puzzle,
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
  const router = useRouter()
  const [newTestOpen, setNewTestOpen] = useState(false)

  const {
    testList,
    setTestList,
    query,
    setQuery,
    filter,
    setFilter,
    filteredTests,
    handleDeleteTest,
  } = useTestList({ initial: tests })

  // Sync when server re-renders with fresh data
  useEffect(() => { setTestList(tests) }, [tests])

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
            className="w-full h-[30px] rounded-[6px] border border-white/10 bg-[#0a0a0a] py-1.5 pl-8 pr-3 text-[13px] text-[#ededed] placeholder:text-[#ededed]/40 focus:border-white/[0.18] focus:outline-none"
          />
        </div>
        <FilterDropdown filter={filter} onChange={setFilter} />
        <button
          onClick={() => router.refresh()}
          title="Refresh test list"
          className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
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
          currentTestCount={testList.length}
          hasFigmaPlugin={hasFigmaPlugin}
          isAtFreeLimit={isAtFreeLimit}
          onClose={() => setNewTestOpen(false)}
        />
      )}

      {/* Empty / No results */}
      {testList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/[0.04]">
            <FlaskConical className="h-5 w-5 text-[#ededed]/40" />
          </div>
          <p className="mt-4 text-[14px] font-medium text-[#ededed]">No experiments yet</p>
          <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-[#ededed]/40">
            {hasFigmaPlugin
              ? 'Create your first variant in Figma and push it here — it appears automatically.'
              : 'Install the Figma plugin first, then create variants directly from your designs.'}
          </p>
          <div className="mt-5 flex items-center gap-3">
            {hasFigmaPlugin ? (
              <button
                onClick={() => setNewTestOpen(true)}
                className="flex items-center gap-1.5 rounded-[6px] bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-85"
              >
                <Plus className="h-3.5 w-3.5" />
                New test
              </button>
            ) : (
              <a
                href="/dashboard/setup"
                className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.18] px-3.5 py-2 text-[12px] font-medium text-[#ededed]/70 transition-colors hover:border-white/25 hover:text-[#ededed]"
              >
                <HeartPulse className="h-3.5 w-3.5" />
                Run setup check
              </a>
            )}
          </div>
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
            <TestCard key={t.id} t={t} onDelete={handleDeleteTest} from="tests" />
          ))}
        </div>
      )}
    </main>
  )
}
