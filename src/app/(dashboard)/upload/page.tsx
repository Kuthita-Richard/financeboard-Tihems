import { getOrgSettings, getTransactions } from '@/lib/sheets'
import UploadClient from './UploadClient'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Import Data' }
export default async function UploadPage() {
  const [settings, txs] = await Promise.all([getOrgSettings(), getTransactions()])

  // Group transactions by import batch for the "Recent Imports" list —
  // manually-entered rows have no importBatchId and are correctly excluded.
  const batchMap = new Map<string, { count: number; importedBy: string; importedAt: string; dates: string[] }>()
  for (const t of txs) {
    if (!t.importBatchId) continue
    const existing = batchMap.get(t.importBatchId)
    if (existing) {
      existing.count++
      existing.dates.push(t.date)
    } else {
      batchMap.set(t.importBatchId, { count: 1, importedBy: t.recordedBy, importedAt: t.recordedAt, dates: [t.date] })
    }
  }
  const recentImports = [...batchMap.entries()]
    .map(([importBatchId, b]) => ({
      importBatchId, count: b.count, importedBy: b.importedBy, importedAt: b.importedAt,
      dateRange: b.dates.length ? `${[...b.dates].sort()[0]} – ${[...b.dates].sort().slice(-1)[0]}` : '',
    }))
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 10)

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>Import Transactions</h2>
        <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
          Upload an Excel or CSV file. Column names are matched flexibly — see the guide below.
        </p>
      </div>
      <UploadClient settings={settings} recentImports={recentImports} />
    </div>
  )
}
