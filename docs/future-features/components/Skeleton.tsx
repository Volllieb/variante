'use client'

/** Base skeleton with pulse animation. Pass className for sizing. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[6px] bg-white/[0.05] ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}

/** Skeleton for a TestCard in the grid */
export function TestCardSkeleton() {
  return (
    <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
      {/* Row: favicon | name | pie */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-[18px] w-[18px] rounded-[4px]" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-[36px] w-[36px] rounded-full" />
      </div>
      {/* Row: status pills */}
      <div className="mt-2.5 flex items-center gap-2">
        <Skeleton className="h-[20px] w-14 rounded-[5px]" />
        <Skeleton className="h-[20px] w-20 rounded-[5px]" />
      </div>
    </div>
  )
}

/** Grid of 6 skeleton test cards */
export function TestGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TestCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton for the stats overview sidebar */
export function StatsSkeleton() {
  return (
    <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  )
}

/** Full dashboard loading skeleton (sidebar layout) */
export function DashboardSkeleton() {
  return (
    <div className="flex gap-5">
      {/* Left column (30%) */}
      <div className="w-[30%] shrink-0 space-y-4">
        <Skeleton className="h-4 w-20" />
        <StatsSkeleton />
        <Skeleton className="h-4 w-16 mt-6" />
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-3.5" />
            </div>
          ))}
        </div>
      </div>
      {/* Right column (70%) */}
      <div className="w-[70%] shrink-0 min-w-0 space-y-4">
        <Skeleton className="h-4 w-16" />
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-[30px] flex-1" />
          <Skeleton className="h-[30px] w-[30px]" />
          <Skeleton className="h-[30px] w-[30px]" />
          <Skeleton className="h-[30px] w-[30px]" />
          <Skeleton className="h-[30px] w-24" />
        </div>
        <TestGridSkeleton />
      </div>
    </div>
  )
}

/** Results page skeleton */
export function ResultsSkeleton() {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-32" />
      </div>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-3 w-40" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <Skeleton className="h-48 w-full rounded-[10px]" />
    </div>
  )
}
