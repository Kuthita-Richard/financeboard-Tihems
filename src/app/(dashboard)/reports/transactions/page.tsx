import { getTransactions, getOrgSettings, getMetadata } from '@/lib/sheets'
import { formatCurrencyCompact, mergeDimensionOptions } from '@/lib/utils'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
import TransactionLedgerTable from './TransactionLedgerTable'
export const metadata: Metadata = { title: 'Transaction Ledger' }
export default async function TxLedgerPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, rawMeta] = await Promise.all([getOrgSettings(), getTransactions(), getMetadata()])
  // The edit modal's dropdowns get the same registry+ledger union as Entry —
  // editing an existing row shouldn't offer a smaller set of options than
  // creating a new one did.
  const meta = mergeDimensionOptions(rawMeta, txs)
  const sym = settings.currencySymbol

  let rows = txs
  if (sp.year)     rows = rows.filter(r => String(r.year)    === sp.year)
  if (sp.month)    rows = rows.filter(r => r.month           === sp.month)
  if (sp.product)  rows = rows.filter(r => r.product         === sp.product)
  if (sp.gateway)  rows = rows.filter(r => r.gateway         === sp.gateway)
  if (sp.region)   rows = rows.filter(r => r.region          === sp.region)
  if (sp.salesRep) rows = rows.filter(r => r.salesRep        === sp.salesRep)
  if (sp.status)   rows = rows.filter(r => r.status          === sp.status)
  rows = rows.sort((a,b) => b.date.localeCompare(a.date))
  const total = rows.reduce((s,r) => s + r.amountPaid, 0)

  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`Transaction Ledger`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Transaction Ledger</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{rows.length} transactions · Total: {formatCurrencyCompact(total, sym)}</p>
        </div>
        <PrintButton />
      </div>
      <TransactionLedgerTable rows={rows} settings={settings} metadata={meta} sym={sym} total={total} />
    </div>
  )
}
