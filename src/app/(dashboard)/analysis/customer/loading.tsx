import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function CustomerAnalysisLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
