import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function GatewayReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
