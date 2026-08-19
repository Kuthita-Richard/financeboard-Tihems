import { PageHeaderSkeleton, FilterBarSkeleton, ChartFullSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function ProductAnalysisLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <ChartFullSkeleton />
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}
