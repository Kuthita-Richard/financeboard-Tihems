import { FilterBarSkeleton, KPIRowSkeleton, ChartRowSkeleton, ChartFullSkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <FilterBarSkeleton />
      <KPIRowSkeleton />
      <ChartRowSkeleton />
      <ChartFullSkeleton />
    </div>
  )
}
