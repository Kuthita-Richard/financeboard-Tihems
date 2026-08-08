import { getTransactions, getTargets, getOrgSettings } from "@/lib/sheets"
import { computePerformance } from "@/lib/performance"
import { MONTHS, formatCurrencyCompact, formatPct, PERFORMANCE_STYLES , getAvailableYears } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import type { Metadata } from "next"
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: "Variance Analysis" }
export default async function VariancePage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, targets] = await Promise.all([getOrgSettings(), getTransactions(), getTargets()])
  const year = parseInt(sp.year || String(new Date().getFullYear()))
  const month = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const thresholds = { exceeding: settings.perfThresholdExceeding, onTrack: settings.perfThresholdOnTrack, atRisk: settings.perfThresholdAtRisk }
  const perf = computePerformance(txs, targets, year, month, thresholds)
  const sym = settings.currencySymbol
  const allRows = [
    ...perf.byProduct.map(r => ({ ...r, dimLabel: settings.productLabel })),
    ...perf.byGateway.map(r => ({ ...r, dimLabel: settings.gatewayLabel })),
    ...perf.byRegion.map(r => ({ ...r, dimLabel: settings.regionLabel })),
    ...perf.bySalesRep.map(r => ({ ...r, dimLabel: settings.salesRepLabel })),
  ].sort((a,b) => a.amountAchievementPct - b.amountAchievementPct)
  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`Variance Analysis`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Variance Analysis</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{month} {year} · Sorted by worst performers first</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter years={years} year={year} month={month} />
          <PrintButton />
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:900 }}>
            <thead>
              <tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
                {["Type","Dimension",`Annual Plan`,`Revised Target`,`Actual (${sym})`,`Variance (${sym})`,`Variance %`,"vs Annual Plan","Flag"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:"#4b6a8f" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row,i) => {
                const st = PERFORMANCE_STYLES[row.flag]
                return (
                  <tr key={row.dimensionType+row.dimensionValue} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                    <td className="px-3 py-2.5" style={{ color:"#4b6a8f" }}>{row.dimLabel}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color:"#0c1a2e" }}>{row.dimensionValue}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(row.amountAnnualTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(row.amountRevisedTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(row.actualAmount, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: row.amountVariance>=0?"#16a34a":"#dc2626" }}>
                      {row.amountVariance>=0?"+":""}{formatCurrencyCompact(row.amountVariance, sym)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: row.amountAchievementPct>=100?"#16a34a":"#dc2626" }}>{formatPct(row.amountAchievementPct)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: row.amountVsAnnualPct>=100?"#16a34a":"#d97706" }}>{formatPct(row.amountVsAnnualPct)}</td>
                    <td className="px-3 py-2.5"><span className={"px-2 py-0.5 rounded-full text-[10px] font-semibold " + st.bg + " " + st.color}>{st.emoji} {row.flag}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
