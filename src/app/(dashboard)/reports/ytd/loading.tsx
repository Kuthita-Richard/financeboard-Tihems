import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function YTDReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={12} cols={5} />
    </div>
  )
}
