import { getOrgSettings, getMetadata, getTransactions } from '@/lib/sheets'
import { mergeDimensionOptions } from '@/lib/utils'
import EntryForm from './EntryForm'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Data Entry' }
export default async function EntryPage() {
  const [settings, meta, txs] = await Promise.all([getOrgSettings(), getMetadata(), getTransactions()])
  // Union of the Data Lists registry + values already seen in the ledger,
  // so a value picked up dynamically from real transactions is selectable
  // here too, not just something an admin pre-registered.
  const metadata = mergeDimensionOptions(meta, txs)
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>New Transaction</h2>
        <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>Record a customer transaction. Targets are managed separately under Targets.</p>
      </div>
      <EntryForm settings={settings} metadata={metadata} />
    </div>
  )
}
