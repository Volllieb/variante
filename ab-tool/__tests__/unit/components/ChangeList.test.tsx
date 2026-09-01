/**
 * ChangeList — die Änderungsliste als Quelle der Wahrheit (Step 2/3).
 *
 * Zeilen editieren/entfernen, KI-Vorschläge einzeln annehmen/verwerfen,
 * Leerzustand und die nicht editierbare other-Zeile. Der Scratch-Editor und
 * die KI-Pipeline liegen in StepChange und haben eigene Tests.
 */

import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChangeList } from '@/app/dashboard/components/new-test/ChangeList'
import type { ChangeEntry } from '@/app/dashboard/components/new-test/types'

const TEXT_ROW: ChangeEntry = {
  id: 't1', property: 'text', before: 'Old text', after: 'New text',
  source: 'manual', status: 'applied',
}

function Harness({ initial }: { initial: ChangeEntry[] }) {
  const [entries, setEntries] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <ChangeList
      entries={entries}
      editingId={editingId}
      onEditingChange={setEditingId}
      onEntriesChange={setEntries}
    />
  )
}

describe('ChangeList', () => {
  it('zeigt den Leerzustand, wenn keine Zeilen existieren', () => {
    render(<Harness initial={[]} />)
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })

  it('zeigt Label und Vorher→Nachher einer Zeile', () => {
    render(<Harness initial={[TEXT_ROW]} />)
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Old text')).toBeInTheDocument()
    expect(screen.getByText('New text')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('ohne Baseline zeigt die Zeile "set to" statt eines Pfeils', () => {
    render(<Harness initial={[{ ...TEXT_ROW, before: '' }]} />)
    expect(screen.getByText('set to')).toBeInTheDocument()
  })

  it('entfernt eine Zeile über [×] — danach Leerzustand', () => {
    render(<Harness initial={[TEXT_ROW]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Text change' }))
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })

  it('editiert eine Zeile inline über den passenden Sub-Control', () => {
    render(<Harness initial={[TEXT_ROW]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Text' }))
    const input = screen.getByPlaceholderText('Text')
    expect(input).toHaveValue('New text')
    fireEvent.change(input, { target: { value: 'Even newer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Even newer')).toBeInTheDocument()
  })

  it('nimmt einen KI-Vorschlag einzeln an — ✓ verschwindet, Edit erscheint', () => {
    const suggested: ChangeEntry = { ...TEXT_ROW, id: 's1', status: 'suggested', source: 'ai' }
    render(<Harness initial={[suggested]} />)
    expect(screen.getByRole('button', { name: 'Accept Text suggestion' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Accept Text suggestion' }))
    expect(screen.queryByRole('button', { name: 'Accept Text suggestion' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Text' })).toBeInTheDocument()
  })

  it('verwirft einen KI-Vorschlag — danach Leerzustand', () => {
    const suggested: ChangeEntry = { ...TEXT_ROW, id: 's1', status: 'suggested', source: 'ai' }
    render(<Harness initial={[suggested]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Text suggestion' }))
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })

  it('die other-Zeile ist nicht editierbar — nur als Gruppe entfernbar, Roh-CSS sichtbar', () => {
    const other: ChangeEntry = {
      id: 'o1', property: 'other', before: '', after: 'Custom CSS',
      source: 'ai', status: 'applied', rawCss: '.cta { letter-spacing: 0.5px; }',
    }
    render(<Harness initial={[other]} />)
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.getByText(/letter-spacing: 0.5px;/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Custom CSS change' }))
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })

  it('read-only rendert keine Aktionen', () => {
    render(
      <ChangeList entries={[TEXT_ROW]} readOnly />
    )
    expect(screen.getByText('New text')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
