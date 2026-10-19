import { getTargets, getTransactions, getMetadata, getOrgSettings } from '@/lib/sheets'
import { mergeDimensionOptions, MONTHS, getAvailableYears } from '@/lib/utils'
import { debugResolveTargetSeries } from '@/lib/performance'
import TargetDebugClient from './TargetDebugClient'

export default async function TargetDebugPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const [targets, txs, rawMeta, settings] = await Promise.all([
    getTargets(), getTransactions(), getMetadata(), getOrgSettings(),
  ])
  const metadata = mergeDimensionOptions(rawMeta, txs)

  const leafType = (sp.type === 'SalesRep' ? 'SalesRep' : 'Gateway') as 'Gateway' | 'SalesRep'
  const region = sp.region || metadata.regions[0] || ''
  const valueOptions = leafType === 'Gateway' ? metadata.gateways : metadata.salesReps
  const dimensionValue = sp.value || valueOptions[0] || ''
  const year = parseInt(sp.year) || getAvailableYears(txs, targets)[0] || new Date().getFullYear()

  const periods: [number, string][] = MONTHS.map(m => [year, m])
  const result = region && dimensionValue
    ? debugResolveTargetSeries(targets, region, dimensionValue, leafType, periods)
    : { series: [], resolution: [] }

  return (
    <TargetDebugClient
      result={result}
      leafType={leafType} region={region} dimensionValue={dimensionValue} year={year}
      regions={metadata.regions} gateways={metadata.gateways} salesReps={metadata.salesReps}
      years={getAvailableYears(txs, targets)}
      settings={settings}
    />
  )
}
