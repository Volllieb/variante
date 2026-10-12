'use client'

import { useState, useMemo, useCallback } from 'react'
import { type TestRow } from '@/app/dashboard/components/TestCard'
import {
  type FilterState,
  DEFAULT_FILTER,
  getDateCutoff,
} from '@/app/dashboard/components/FilterDropdown'

export type UseTestListOptions = {
  initial: TestRow[]
  /** Wenn true, wird nach Visitors (desc/asc) sortiert. Default: false (unsorted). */
  sort?: boolean
}

export type UseTestListReturn = {
  testList: TestRow[]
  setTestList: React.Dispatch<React.SetStateAction<TestRow[]>>
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  filter: FilterState
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>
  sortAsc: boolean
  setSortAsc: React.Dispatch<React.SetStateAction<boolean>>
  filteredTests: TestRow[]
  handleDeleteTest: (id: string) => void
  addTest: (test: TestRow) => void
}

export function useTestList({ initial, sort = false }: UseTestListOptions): UseTestListReturn {
  const [testList, setTestList] = useState(initial)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [sortAsc, setSortAsc] = useState(false)

  // ponytail: Server-Daten übernehmen, wenn `router.refresh()` neue Props liefert.
  // Vorher stand dafür ein `useEffect(() => setTestList(tests), [tests])` in
  // DashboardClient/TestsClient — das rendert erst mit veralteten Daten und
  // triggert dann einen zweiten Render (react-hooks/set-state-in-effect).
  // Der dokumentierte React-Weg ist das Anpassen während des Renders anhand
  // der vorigen Props: ein Render, kein Flash der alten Liste.
  const [prevInitial, setPrevInitial] = useState(initial)
  if (prevInitial !== initial) {
    setPrevInitial(initial)
    setTestList(initial)
  }

  const handleDeleteTest = useCallback((id: string) => {
    setTestList((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addTest = useCallback((test: TestRow) => {
    setTestList((prev) => [test, ...prev])
  }, [])

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase()
    const dateCutoff = getDateCutoff(filter.date)

    // Optional: sortieren
    let result = sort
      ? [...testList].sort((a, b) => {
          const va = (a.visitors_a ?? 0) + (a.visitors_b ?? 0)
          const vb = (b.visitors_a ?? 0) + (b.visitors_b ?? 0)
          return sortAsc ? va - vb : vb - va
        })
      : testList

    // Text search
    if (q) {
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) || (t.site_url ?? '').toLowerCase().includes(q)
      )
    }

    // Status filter
    if (filter.status !== 'all') {
      if (filter.status === 'health-issues') {
        result = result.filter((t) => t.health_status === 'issues')
      } else {
        result = result.filter((t) => t.status === filter.status)
      }
    }

    // Date filter
    if (dateCutoff !== null) {
      result = result.filter((t) => new Date(t.created_at).getTime() >= dateCutoff)
    }

    // Winner filter
    if (filter.winner === 'yes') {
      result = result.filter((t) => t.winner !== null)
    } else if (filter.winner === 'inprogress') {
      result = result.filter((t) => t.winner === null)
    }

    return result
  }, [testList, query, filter, sortAsc, sort])

  return {
    testList,
    setTestList,
    query,
    setQuery,
    filter,
    setFilter,
    sortAsc,
    setSortAsc,
    filteredTests,
    handleDeleteTest,
    addTest,
  }
}
