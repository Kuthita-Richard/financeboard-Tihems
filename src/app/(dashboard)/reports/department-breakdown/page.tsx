import {
  getOrgSettings, getTransactions, getTargets,
  getSchemeDepartmentMap, getSchemeSalesRepMap, getMetadata,
} from '@/lib/sheets'
import { computePerformance, buildEffectiveSchemeMap } from '@/lib/performance'
import { MONTHS, formatCurrencyCompact, formatPct, getAvailableYears, mergeDimensionOptions } from '@/lib/utils'
import DeptReportFilters from './DeptReportFilters'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'

export const metadata: Metadata = { title: 'Department Breakdown Report' }

export default async function DepartmentBreakdownPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams

  const [settings, txs, targets, schemeMap, salesRepMap, rawMeta] = await Promise.all([
    getOrgSettings(), getTransactions(), getTargets(),
    getSchemeDepartmentMap(), getSchemeSalesRepMap(), getMetadata(),
  ])
  const metaOptions = mergeDimensionOptions(rawMeta, txs)

  const yearParam = sp.year || String(new Date().getFullYear())
  const year: number | 'All' = yearParam === 'All' ? 'All' : (parseInt(yearParam) || new Date().getFullYear())
  const month  = sp.month  || MONTHS[new Date().getMonth()]
  const region = sp.region || 'All'
  const departmentFilter = sp.department || 'All'

  const years = getAvailableYears(txs, targets)
  const thresholds = { exceeding: settings.perfThresholdExceeding, onTrack: settings.perfThresholdOnTrack, atRisk: settings.perfThresholdAtRisk }

  const perf = computePerformance(txs, targets, year, month, thresholds, { region }, schemeMap, salesRepMap)
  const effectiveSchemeMap = buildEffectiveSchemeMap(txs, schemeMap)

  // Which departments to render as their own section: just the one picked,
  // or every department that actually has a computed row (has schemes
  // mapped to it, or at least real transactions) when 'All' is selected.
  const departmentsToShow = departmentFilter === 'All'
    ? perf.byProduct.map(r => r.dimensionValue)
    : [departmentFilter]

  const sym = settings.currencySymbol
  const monthColLabel = month === 'All' ? `${year === 'All' ? 'All-time' : year} Actual` : month

  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title="Department Breakdown Report" />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Department Breakdown Report</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
            Every {settings.gatewayLabel.toLowerCase()} under each {settings.productLabel.toLowerCase()}, same layout as your working-targets spreadsheet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DeptReportFilters
            years={years} year={yearParam} month={month} region={region} department={departmentFilter}
            regionLabel={settings.regionLabel} productLabel={settings.productLabel}
            regions={metaOptions.regions} departments={metaOptions.products}
          />
          <PrintButton />
        </div>
      </div>

      {departmentsToShow.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          No {settings.productLabel.toLowerCase()} data for this period{region !== 'All' ? ` at ${region}` : ''}.
        </p>
      )}

      {departmentsToShow.map(deptName => {
        const totalRow = perf.byProduct.find(r => r.dimensionValue === deptName)
        const schemeRows = perf.byGateway
          .filter(g => effectiveSchemeMap.get(g.dimensionValue) === deptName)
          .sort((a, b) => a.dimensionValue.localeCompare(b.dimensionValue))

        return (
          <div key={deptName} className="rounded-xl border overflow-hidden" style={{ borderColor: '#bfdbfe', breakInside: 'avoid' }}>
            <div className="px-4 py-3" style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <p className="text-sm font-bold" style={{ color: '#0c1a2e' }}>
                {deptName} {settings.productLabel} — {month === 'All' ? (year === 'All' ? 'All-time' : `${year}`) : `${month} ${year}`} Performance
              </p>
              {region !== 'All' && <p className="text-xs mt-0.5" style={{ color: '#4b6a8f' }}>{settings.regionLabel}: {region}</p>}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f8fbff', borderBottom: '1px solid #bfdbfe' }}>
                  {[settings.gatewayLabel, 'Given Target', 'Working Target', monthColLabel, '% Achieved'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4b6a8f' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schemeRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-3 text-xs italic" style={{ color: 'var(--muted-fg)' }}>
                    No {settings.gatewayLabel.toLowerCase()}s classified under this {settings.productLabel.toLowerCase()} yet — see Settings → Classifications.
                  </td></tr>
                ) : schemeRows.map((row, i) => (
                  <tr key={row.dimensionValue} style={{ borderBottom: '1px solid #e0f2fe', background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                    <td className="px-3 py-2.5 font-medium" style={{ color: '#0c1a2e' }}>{row.dimensionValue}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#4b6a8f' }}>{formatCurrencyCompact(row.amountAnnualTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#4b6a8f' }}>{formatCurrencyCompact(row.amountRevisedTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: '#0284c7' }}>{formatCurrencyCompact(row.actualAmount, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: row.amountAchievementPct >= 100 ? '#16a34a' : '#dc2626' }}>{formatPct(row.amountAchievementPct)}</td>
                  </tr>
                ))}
                {totalRow && (
                  <tr style={{ borderTop: '2px solid #bfdbfe', background: '#eff6ff' }}>
                    <td className="px-3 py-2.5 font-bold" style={{ color: '#0c1a2e' }}>Total</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: '#0c1a2e' }}>{formatCurrencyCompact(totalRow.amountAnnualTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: '#0c1a2e' }}>{formatCurrencyCompact(totalRow.amountRevisedTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: '#0284c7' }}>{formatCurrencyCompact(totalRow.actualAmount, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: totalRow.amountAchievementPct >= 100 ? '#16a34a' : '#dc2626' }}>{formatPct(totalRow.amountAchievementPct)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
