import { NextResponse }           from 'next/server'
import { auth }                   from '@/lib/auth'
import { initializeSpreadsheet }  from '@/lib/sheets'
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 })
  if (session.user.role !== 'Admin') return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 })
  const result = await initializeSpreadsheet()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
