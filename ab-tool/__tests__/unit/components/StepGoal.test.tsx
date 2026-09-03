/**
 * StepGoal — "Tested element" als Goal-Option.
 *
 * Regression: Wer einen Button testet, musste das Goal zuvor EIN ZWEITES MAL
 * picken — der Goal-Picker poppte trotz Auto-Selektion auf und der Confirm
 * blieb gesperrt, bis erneut gepickt wurde. Jetzt ist das getestete Element
 * für klickbare Elemente der Default-Goal; für nicht klickbare ist die
 * Option gegraut und erklärt sich per Hover-Meldung.
 */

import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepGoal } from '@/app/dashboard/components/new-test/StepGoal'
import type { GoalSelection } from '@/app/dashboard/components/NewTestDrawer'

function renderGoal(opts: {
  elementType?: string
  elementName?: string
  elementSelector?: string
  url?: string
  initialGoal?: GoalSelection | null
} = {}) {
  const onGoalSelected = vi.fn<(g: GoalSelection) => void>()
  const onConfirm = vi.fn<() => void>()

  function Host() {
    const [goal, setGoal] = useState<GoalSelection | null>(opts.initialGoal ?? null)
    return (
      <StepGoal
        elementType={opts.elementType ?? 'element'}
        elementName={opts.elementName ?? 'Element'}
        elementSelector={opts.elementSelector ?? ''}
        url={opts.url ?? ''}
        selectedGoal={goal}
        onGoalSelected={(g) => { onGoalSelected(g); setGoal(g) }}
        onConfirm={onConfirm}
      />
    )
  }
  render(<Host />)
  return { onGoalSelected, onConfirm }
}

function firstOpenUrl(): string {
  const calls = (window.open as unknown as ReturnType<typeof vi.fn>).mock.calls
  return calls[0]?.[0] as string
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StepGoal — Tested element', () => {
  it('button: getestetes Element ist Default-Goal — kein zweites Picker-Popup', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const { onGoalSelected } = renderGoal({
      elementType: 'button',
      elementName: 'Sign up',
      elementSelector: '.cta-button',
      url: 'https://example.com',
    })

    expect(screen.getByText('Defaulted to your tested button')).toBeInTheDocument()
    expect(screen.getByText('Clicks on "Sign up"')).toBeInTheDocument()
    await waitFor(() => expect(onGoalSelected).toHaveBeenCalledWith({
      type: 'click',
      selector: '.cta-button',
      label: 'Clicks on "Sign up"',
      source: 'tested',
    }))
    // Der Kern der Regression: für Buttons poppt kein zweiter Picker auf.
    expect(window.open).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm conversion goal' })).toBeEnabled()
  })

  it('link zählt als klickbar — ebenfalls tested-Default', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderGoal({ elementType: 'link', elementName: 'Pricing', elementSelector: 'a.pricing', url: 'https://example.com' })

    expect(screen.getByText('Defaulted to your tested link')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm conversion goal' })).toBeEnabled())
  })

  it('nicht klickbar: tested-Option gegraut, Hover-Meldung im DOM, kein Auto-Goal', () => {
    const { onGoalSelected } = renderGoal({
      elementType: 'headline',
      elementName: 'Hero',
      elementSelector: 'h1',
      url: '',
    })

    expect(screen.getByRole('button', { name: 'Tested element' })).toBeDisabled()
    // Der Tooltip ist nur bei Hover sichtbar, aber immer im Dokument.
    expect(screen.getByText('It seems that the tested element is not clickable')).toBeInTheDocument()
    expect(onGoalSelected).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirm conversion goal' })).toBeDisabled()
  })

  it('nicht klickbar: Picker öffnet automatisch mit ?ab_goal=1', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    renderGoal({ elementType: 'headline', elementName: 'Hero', elementSelector: 'h1', url: 'https://example.com' })

    await waitFor(() => expect(openSpy).toHaveBeenCalled())
    expect(firstOpenUrl()).toContain('ab_goal=1')
  })

  it('"Pick a different goal element" wechselt in den Picker und öffnet ihn', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    renderGoal({
      elementType: 'button',
      elementName: 'Sign up',
      elementSelector: '.cta-button',
      url: 'https://example.com',
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm conversion goal' })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: 'Pick a different goal element' }))
    await waitFor(() => expect(openSpy).toHaveBeenCalled())
    expect(firstOpenUrl()).toContain('ab_goal=1')
  })
})
