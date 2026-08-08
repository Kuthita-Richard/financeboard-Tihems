import { getTransactions, getTargets, getOrgSettings } from '@/lib/sheets'
import { computePerformance } from '@/lib/performance'
import { MONTHS, getAvailableYears } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import AnalysisTable from '../AnalysisTable'
import AnalysisChart from '../AnalysisChart'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Gateway Analysis' }
export default async function GatewayAnalysisPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, targets] = await Promise.all([getOrgSettings(), getTransactions(), getTargets()])
  const year  = parseInt(sp.year  || String(new Date().getFullYear()))
  const month = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const perf  = computePerformance(txs, targets, year, month, {
    exceeding: settings.perfThresholdExceeding,
    onTrack:   settings.perfThresholdOnTrack,
    atRisk:    settings.perfThresholdAtRisk,
  })
  const sym   = settings.currencySymbol
  const label = settings.gatewayLabel
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>{label} Analysis</h2>
          <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
            {month} {year} · {perf.byGateway.length} {label.toLowerCase()}s
          </p>
        </div>
        <PeriodFilter years={years} year={year} month={month} />
      </div>
      <AnalysisChart rows={perf.byGateway} sym={sym} />
      <AnalysisTable rows={perf.byGateway} sym={sym} dimLabel={label} />
    </div>
  )
}
