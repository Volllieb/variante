'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTestList } from '@/lib/useTestList'
import { Tooltip } from '@/app/components/Tooltip'
import { EmptyState } from '@/app/components/EmptyState'
import { NewTestDrawer } from '../components/NewTestDrawer'
import { TestCard, type TestRow } from '../components/TestCard'
import {
  FilterDropdown,
} from '../components/FilterDropdown'
import {
  Search,
  RefreshCw,
  Plus,
  FlaskConical,
  Code,
} from 'lucide-react'

/* ── Token palette ── */

/* ── Component ── */

export function TestsClient({
  apiToken,
  tests,
  hasFigmaPlugin,
  userId,
  plan,
}: {
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
  userId: string
  plan: string
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
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
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
        <Tooltip content="Refresh test list">
          <button
            onClick={() => router.refresh()}
            className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Create new test">
          <button
            onClick={() => setNewTestOpen(true)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            <Plus className="h-3.5 w-3.5" />
            New test
          </button>
        </Tooltip>
      </div>

      {/* New test flow — Drawer Wizard */}
      <NewTestDrawer
        isOpen={newTestOpen}
        onClose={() => setNewTestOpen(false)}
        userId={userId}
        onTestCreated={() => {
          setNewTestOpen(false)
          router.refresh()
        }}
      />

      {/* Empty / No results */}
      {testList.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No experiments yet"
          description={
            hasFigmaPlugin
              ? 'Create your first variant in Figma and push it here — it appears automatically.'
              : 'Install the Figma plugin first, then create variants directly from your designs.'
          }
        >
          <div className="flex items-center gap-3">
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
                href="/dashboard/health"
                className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.18] px-3.5 py-2 text-[12px] font-medium text-[#ededed]/70 transition-colors hover:border-white/25 hover:text-[#ededed]"
              >
                <Code className="h-3.5 w-3.5" />
                Install snippet
              </a>
            )}
          </div>
        </EmptyState>
      ) : filteredTests.length === 0 ? (
        <EmptyState
          icon={Search}
          title={query ? `No tests match "${query}"` : 'No tests in this filter'}
          description={query ? 'Try a different search term or clear the filter.' : 'Try a different filter selection.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTests.map((t) => (
            <TestCard key={t.id} t={t} onDelete={handleDeleteTest} from="tests" />
          ))}
        </div>
      )}
    </div>
  )
}
