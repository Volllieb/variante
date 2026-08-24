import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/app/components/EmptyState'
import { FlaskConical } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No tests yet" />)
    expect(screen.getByText('No tests yet')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing to see here" />)
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />)
    expect(container.querySelector('p.mt-1\\.5')).toBeNull()
  })

  it('renders children in the action slot', () => {
    render(
      <EmptyState title="Empty">
        <button>Create test</button>
      </EmptyState>
    )
    expect(screen.getByText('Create test')).toBeInTheDocument()
  })

  it('has role="status" and aria-live="polite"', () => {
    const { container } = render(<EmptyState title="Empty" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('role', 'status')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })

  it('renders custom icon when provided', () => {
    render(<EmptyState icon={FlaskConical} title="No tests" />)
    // Custom icon is rendered (we just check component doesn't crash)
    expect(screen.getByText('No tests')).toBeInTheDocument()
  })
})
