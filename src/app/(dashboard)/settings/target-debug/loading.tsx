import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function TargetDebugLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={4} cols={5} />
      <TableSkeleton rows={12} cols={6} />
    </div>
  )
}
