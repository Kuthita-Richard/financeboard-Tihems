import { getTargets, getOrgSettings, getMetadata, getTransactions } from '@/lib/sheets'
import { mergeDimensionOptions } from '@/lib/utils'
import TargetsClient from './TargetsClient'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Targets' }
export default async function TargetsPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, meta, targets, txs] = await Promise.all([getOrgSettings(), getMetadata(), getTargets(), getTransactions()])
  // Union of the Data Lists registry + values already seen in the ledger —
  // you can set a target against a dimension value the moment it's either
  // registered or has actually been transacted against.
  const metadata = mergeDimensionOptions(meta, txs)
  return <TargetsClient targets={targets} settings={settings} metadata={metadata} filter={{ year: sp.year || '', month: sp.month || '', dim: sp.dim || '' }} />
}
