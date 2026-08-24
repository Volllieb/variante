import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  Skeleton,
  TestCardSkeleton,
  TestGridSkeleton,
  StatsSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ListSkeleton,
  ResultsSkeleton,
} from '@/app/components/Skeleton'

describe('Skeleton', () => {
  it('renders base skeleton with aria-hidden', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.className).toContain('animate-pulse')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-40" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-10')
    expect(el.className).toContain('w-40')
  })
})

describe('TestCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TestCardSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('TestGridSkeleton', () => {
  it('renders default count of 6 cards', () => {
    const { container } = render(<TestGridSkeleton />)
    const cards = container.querySelectorAll('.grid > *')
    expect(cards.length).toBe(6)
  })

  it('renders custom count', () => {
    const { container } = render(<TestGridSkeleton count={3} />)
    const cards = container.querySelectorAll('.grid > *')
    expect(cards.length).toBe(3)
  })
})

describe('StatsSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatsSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('DashboardSkeleton', () => {
  it('renders two-column layout', () => {
    const { container } = render(<DashboardSkeleton />)
    const columns = container.querySelectorAll('[class*="w-[30%]"], [class*="w-[70%]"]')
    expect(columns.length).toBe(2)
  })
})

describe('FormSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<FormSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('ListSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ListSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('ResultsSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ResultsSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})
