import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'
export default function UploadLoading() {
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeaderSkeleton />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}
