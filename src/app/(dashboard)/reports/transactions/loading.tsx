import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function TransactionsReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <TableSkeleton rows={12} cols={9} />
    </div>
  )
}
