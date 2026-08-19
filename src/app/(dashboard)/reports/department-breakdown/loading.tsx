import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function DepartmentBreakdownLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={6} cols={5} />
      <TableSkeleton rows={4} cols={5} />
    </div>
  )
}
