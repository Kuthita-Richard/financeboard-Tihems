import { Skeleton, KPIRowSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
export default function ReportsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)}
      </div>
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <Skeleton className="h-6 w-64" />
        <KPIRowSkeleton />
      </div>
      <TableSkeleton rows={8} cols={7} />
    </div>
  )
}
