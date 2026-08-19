import { PageHeaderSkeleton, ChartFullSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function RegionLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <ChartFullSkeleton />
      <TableSkeleton rows={5} cols={7} />
    </div>
  )
}
