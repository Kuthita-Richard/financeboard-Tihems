import { PageHeaderSkeleton, FilterBarSkeleton, KPIRowSkeleton, ChartRowSkeleton } from '@/components/ui/Skeleton'
export default function ExecutiveReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <KPIRowSkeleton />
      <ChartRowSkeleton />
    </div>
  )
}
