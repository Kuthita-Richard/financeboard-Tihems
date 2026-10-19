import { NextResponse }        from 'next/server'
import { auth }                from '@/lib/auth'
import { migrateEncryptLedger } from '@/lib/sheets'
import { revalidateTag } from 'next/cache'

// One-time migration: visit this URL once while logged in as Admin to
// encrypt customerName/product/amountPaid on every existing ledger row.
// Safe to run more than once — already-encrypted rows are skipped.
//
// Route Handlers (this file) can only invalidate the data cache with
// revalidateTag — updateTag is Server-Action-only and throws if called
// from here. That distinction matters concretely: migrateEncryptLedger()
// below completes and actually encrypts the rows BEFORE the tag call —
// so the earlier version of this file, which called updateTag() here by
// mistake, could report { ok: false } even though the migration itself
// had already succeeded. If you saw that failure message before this fix,
// it's worth checking your Sheet directly — the rows may already be
// encrypted despite the error. Re-running this route is always safe
// either way, since already-encrypted rows are detected and skipped.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 })
  if (session.user.role !== 'Admin') return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 })
  try {
    const result = await migrateEncryptLedger()
    // revalidateTag (not updateTag — Server-Action-only) needs an explicit
    // cache-life profile as its second argument in this Next.js version;
    // { expire: 0 } means "treat as already stale", the Route Handler
    // equivalent of updateTag's immediate invalidation.
    revalidateTag('transactions', { expire: 0 })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Migration failed' }, { status: 500 })
  }
}
