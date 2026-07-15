import { DashboardSkeleton } from '@/app/components/Skeleton'

export default function Loading() {
  return (
    <div className="px-5 py-6 sm:px-8">
      <DashboardSkeleton />
    </div>
  )
}
