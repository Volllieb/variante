/**
 * UI-Primitives, Phase 1 (brandguidelines v3 §6).
 *
 * Getestet wird, was Phase 1 tatsächlich geändert hat — nicht, dass React
 * rendert. Lokal ist kein Dashboard-Login möglich, die Zustände werden
 * deshalb hier geprüft statt im Browser.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { Badge } from '@/app/components/Badge'
import { Button } from '@/app/components/Button'
import { Card } from '@/app/components/Card'
import { ConfirmDialog } from '@/app/components/Modal'
import { Field } from '@/app/components/Field'
import { Input } from '@/app/components/Input'
import { SegmentedControl } from '@/app/components/SegmentedControl'
import { Select } from '@/app/components/Select'
import { StatusDot } from '@/app/components/StatusDot'
import { Toggle } from '@/app/components/Toggle'
import { cn } from '@/lib/utils'

describe('cn', () => {
  // Das nackte twMerge hielt `text-meta` und `text-ok` für denselben
  // Konflikt und warf die erste Klasse weg — beim Primär-Button hieß das
  // weiße Fläche ohne Textfarbe. lib/utils.ts trennt die Gruppen wieder.
  it('hält Schriftgröße und Textfarbe auseinander', () => {
    expect(cn('text-meta', 'text-ok')).toBe('text-meta text-ok')
    expect(cn('text-text-on-invert', 'text-small')).toBe('text-text-on-invert text-small')
  })

  it('überschreibt Größe mit Größe und Farbe mit Farbe', () => {
    expect(cn('text-meta', 'text-body')).toBe('text-body')
    expect(cn('text-ok', 'text-err')).toBe('text-err')
  })
})

describe('Button', () => {
  it('rendert href als Link', () => {
    render(<Button href="/dashboard">Open</Button>)
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/dashboard')
  })

  it('deaktiviert href: kein Link, sondern aria-disabled', () => {
    // §6.1-TODO: vorher blieb der Link bei disabled klickbar und in der
    // Tab-Reihenfolge.
    render(
      <Button href="/dashboard" disabled>
        Open
      </Button>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Open')).toHaveAttribute('aria-disabled', 'true')
  })

  it('blockt Klicks während loading', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('size=icon ist quadratisch', () => {
    render(
      <Button size="icon" aria-label="Close">
        x
      </Button>,
    )
    const cls = screen.getByRole('button', { name: 'Close' }).className
    expect(cls).toContain('h-8')
    expect(cls).toContain('w-8')
  })

  it('className gewinnt gegen die Size-Variante (twMerge)', () => {
    render(<Button className="px-8">Wide</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('px-8')
    expect(cls).not.toContain('px-4')
  })

  it('variant=link erbt Farbe und Gewicht der Umgebung', () => {
    // Eine Text-Aktion in einer getönten Hinweisbox soll deren Farbe behalten
    // und nicht auf das Grau von ghost fallen.
    render(
      <Button variant="link" size="inline">
        Try again
      </Button>,
    )
    const cls = screen.getByRole('button').className
    expect(cls).toContain('text-[color:inherit]')
    expect(cls).toContain('p-0')
    expect(cls).not.toContain('text-text-3')
    expect(cls).not.toContain('font-semibold')
  })
})

describe('Toggle', () => {
  it('meldet seinen Zustand als switch', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Notify on winner" />)
    const sw = screen.getByRole('switch', { name: 'Notify on winner' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('schaltet um', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Notify on winner" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Field', () => {
  it('verbindet Label und Control ohne Zutun der Aufrufstelle', () => {
    render(
      <Field label="Site URL">
        <Input />
      </Field>,
    )
    // getByLabelText findet das Input nur über label[for] → input[id].
    expect(screen.getByLabelText('Site URL')).toBeInstanceOf(HTMLInputElement)
  })

  it('Hilfetext hängt per aria-describedby am Control', () => {
    render(
      <Field label="Site URL" hint="Include https://">
        <Input />
      </Field>,
    )
    const input = screen.getByLabelText('Site URL')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent('Include https://')
  })

  it('Fehler ersetzt den Hilfetext und setzt aria-invalid', () => {
    render(
      <Field label="Site URL" hint="Include https://" error="Not a valid URL">
        <Input />
      </Field>,
    )
    const input = screen.getByLabelText('Site URL')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Include https://')).toBeNull()
    expect(screen.getByText('Not a valid URL')).toBeInTheDocument()
  })

  it('gilt auch für Select', () => {
    render(
      <Field label="Goal">
        <Select>
          <option value="click">Click</option>
        </Select>
      </Field>,
    )
    expect(screen.getByLabelText('Goal')).toBeInstanceOf(HTMLSelectElement)
  })

  it('hideLabel hält das Label für Screenreader', () => {
    render(
      <Field label="Search" hideLabel>
        <Input />
      </Field>,
    )
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
  })
})

describe('SegmentedControl', () => {
  const OPTIONS = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 0, label: 'All', disabled: true, title: 'Pro only' },
  ] as const

  it('markiert die aktive Option per aria-pressed', () => {
    render(<SegmentedControl label="Time range" value={30} onChange={() => {}} options={OPTIONS} />)
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('meldet den Wechsel', () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Time range" value={30} onChange={onChange} options={OPTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: '7d' }))
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('gesperrte Option schaltet nicht', () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Time range" value={30} onChange={onChange} options={OPTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('die Gruppe hat einen Namen', () => {
    render(<SegmentedControl label="Time range" value={30} onChange={() => {}} options={OPTIONS} />)
    expect(screen.getByRole('group', { name: 'Time range' })).toBeInTheDocument()
  })

  it('gesperrte Option bleibt fokussierbar und erklärt sich', () => {
    // aria-disabled statt disabled: ein disabled-Button zeigt in Firefox
    // weder :hover noch seinen Tooltip — deshalb stand um solche Optionen
    // vorher ein Wrapper-<div> mit eigener Hilfe-Blase.
    render(<SegmentedControl label="Time range" value={30} onChange={() => {}} options={OPTIONS} />)
    const all = screen.getByRole('button', { name: 'All' })
    expect(all).toHaveAttribute('aria-disabled', 'true')
    expect(all).not.toBeDisabled()
    expect(screen.getByText('Pro only')).toBeInTheDocument()
  })
})

describe('Badge, Card, StatusDot', () => {
  it('Badge folgt §6.2: rounded-sm, font-semibold, text-meta', () => {
    render(<Badge tone="ok">Live</Badge>)
    const cls = screen.getByText('Live').className
    expect(cls).toContain('rounded-sm')
    expect(cls).toContain('font-semibold')
    expect(cls).toContain('text-meta')
    expect(cls).not.toContain('rounded-full')
  })

  it('Card ist rounded-md, nicht rounded-lg (§4.1)', () => {
    const { container } = render(<Card>Inhalt</Card>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('rounded-md')
    expect(cls).not.toContain('rounded-lg')
  })

  it('Card interactive setzt .surface-interactive', () => {
    const { container } = render(<Card interactive>Inhalt</Card>)
    expect((container.firstElementChild as HTMLElement).className).toContain('surface-interactive')
  })

  it('StatusDot trägt einen Namen, auch ohne Label daneben', () => {
    render(<StatusDot status="live" />)
    expect(screen.getByRole('img', { name: 'Live' })).toBeInTheDocument()
  })

  it('draft ist ein gestrichelter Ring, kein gefüllter Punkt (§6.4)', () => {
    render(<StatusDot status="draft" />)
    const cls = screen.getByRole('img', { name: 'Draft' }).className
    expect(cls).toContain('border-dashed')
    expect(cls).not.toContain('bg-ok')
  })
})

describe('ConfirmDialog', () => {
  it('zeigt Titel und Frage als Dialog', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete test?"
        description="This removes all collected data."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {}}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Delete test?')
    expect(screen.getByText('This removes all collected data.')).toBeInTheDocument()
  })

  it('bestätigt nur über den Confirm-Button', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete test?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
