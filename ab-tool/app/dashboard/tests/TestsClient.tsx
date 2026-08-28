'use client'

import { useState } from 'react'
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

/* ── Component ── */

// ponytail: apiToken/plan waren tote Props (Plan SEC-10/CODE-01).
export function TestsClient({
  tests,
  hasFigmaPlugin,
  userId,
  verifiedDomains,
}: {
  tests: TestRow[]
  hasFigmaPlugin: boolean
  userId: string
  verifiedDomains: { url: string; verifiedAt: string | null }[]
}) {
  const router = useRouter()
  const [newTestOpen, setNewTestOpen] = useState(false)
  const [resumeTest, setResumeTest] = useState<TestRow | null>(null)

  // Sync mit frischen Server-Daten passiert in useTestList selbst.
  const {
    testList,
    setTestList,
    query,
    setQuery,
    filter,
    setFilter,
    filteredTests,
    handleDeleteTest,
    addTest,
  } = useTestList({ initial: tests })

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find test…"
            className="w-full h-[30px] rounded-[var(--radius-md)] border border-border bg-bg-1 py-1.5 pl-8 pr-3 text-[13px] text-text placeholder:text-text-3 focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
          />
        </div>
        <FilterDropdown filter={filter} onChange={setFilter} />
        <Tooltip content="Refresh test list">
          <button
            onClick={() => router.refresh()}
            className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border bg-bg-1 text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Create new test">
          <button
            onClick={() => { setResumeTest(null); setNewTestOpen(true) }}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-3 py-1.5 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            New test
          </button>
        </Tooltip>
      </div>

      {/* New test flow — Drawer Wizard */}
      <NewTestDrawer
        isOpen={newTestOpen}
        onClose={() => { setNewTestOpen(false); setResumeTest(null) }}
        userId={userId}
        resumeTest={resumeTest}
        onTestCreated={(createdTest) => {
          if (resumeTest) {
            // Resume: update existing draft in list
            setTestList((prev) => prev.map((t) =>
              t.id === resumeTest.id
                ? { ...t, name: createdTest.name, site_url: createdTest.site_url, status: createdTest.status, health_status: null, health_issues: null }
                : t
            ))
          } else {
            addTest({
              id: createdTest.id,
              name: createdTest.name,
              site_url: createdTest.site_url,
              status: createdTest.status,
              visitors_a: 0,
              visitors_b: 0,
              conversions_a: 0,
              conversions_b: 0,
              winner: null,
              created_at: new Date().toISOString(),
            })
          }
          setNewTestOpen(false)
          setResumeTest(null)
        }}
        verifiedDomains={verifiedDomains}
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
                onClick={() => { setResumeTest(null); setNewTestOpen(true) }}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-3.5 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                New test
              </button>
            ) : (
              <a
                href="/dashboard/health"
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border-strong px-3.5 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border hover:text-text"
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
            <TestCard key={t.id} t={t} onDelete={handleDeleteTest} from="tests" onCompleteDraft={(test) => { setResumeTest(test); setNewTestOpen(true) }} />
          ))}
        </div>
      )}
    </div>
  )
}
