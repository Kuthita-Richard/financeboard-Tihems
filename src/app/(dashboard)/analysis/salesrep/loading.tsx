import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function SalesRepLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} cols={8} />
    </div>
  )
}
