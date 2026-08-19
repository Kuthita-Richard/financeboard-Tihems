import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function SalesRepReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
