import { PageHeaderSkeleton, ChartFullSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function TrendsLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <ChartFullSkeleton />
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}
