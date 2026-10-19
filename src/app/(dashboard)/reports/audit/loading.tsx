import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function AuditReportLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={6} />
    </div>
  )
}
