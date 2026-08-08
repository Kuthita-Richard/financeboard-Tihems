/**
 * Skeleton.tsx — Reusable animated placeholder component
 *
 * Used in loading.tsx files to mirror the layout of the real page
 * while server data is being fetched. Prevents layout shift by matching
 * widths, heights, and grid structures of actual content.
 */

interface SkeletonProps {
  className?: string
  style?:     React.CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--muted)', ...style }}
      aria-hidden="true"
    />
  )
}

/** Row of skeleton filter pills matching the dashboard filter bar */
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${80 + i * 8}px` }} />
      ))}
    </div>
  )
}

/** Five KPI card skeletons matching the dashboard top row */
export function KPIRowSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

/** Three-column chart row skeleton */
export function ChartRowSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-3"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/** Full-width chart skeleton */
export function ChartFullSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-3"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}

/** Table skeleton with configurable row count */
export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3"
        style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? 120 : 80 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3"
          style={{
            borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none',
            background: i % 2 === 0 ? 'var(--card)' : 'var(--input)',
          }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3 flex-1"
              style={{ maxWidth: j === 0 ? 120 : 80, opacity: 0.6 + j * 0.05 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Simple page header skeleton */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-1.5 mb-5">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-3 w-72" />
    </div>
  )
}

/** Drill-through back banner skeleton */
export function DrillBannerSkeleton() {
  return (
    <Skeleton className="h-12 w-full rounded-xl" />
  )
}

/** Form page skeleton */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-1.5 mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-64" />
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  )
}
