import { getTransactions, getTargets, getOrgSettings } from '@/lib/sheets'
import { computePerformance } from '@/lib/performance'
import { MONTHS, formatCurrencyCompact, formatPct , getAvailableYears } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { PERFORMANCE_STYLES } from '@/lib/utils'
import type { Metadata } from 'next'
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: 'Performance Report' }

function Section({ title, rows, sym }: { title: string; rows: ReturnType<typeof computePerformance>['byProduct']; sym: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color:"#4b6a8f" }}>{title}</p>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
              {["Dimension",`Actual (${sym})`,`Annual Plan`,`Revised Target`,"vs Revised","vs Annual","Customers","Cust.Target","Active","Status"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:"#4b6a8f" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i) => {
              const st = PERFORMANCE_STYLES[row.flag]
              return (
                <tr key={row.dimensionValue} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                  <td className="px-3 py-2 font-semibold" style={{ color:"#0c1a2e" }}>{row.dimensionValue}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(row.actualAmount, sym)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(row.amountAnnualTarget, sym)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(row.amountRevisedTarget, sym)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color: row.amountAchievementPct>=100?"#16a34a":"#dc2626" }}>{formatPct(row.amountAchievementPct)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: row.amountVsAnnualPct>=100?"#16a34a":"#d97706" }}>{formatPct(row.amountVsAnnualPct)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color:"#0c1a2e" }}>{row.actualCount}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color:"#4b6a8f" }}>{row.countRevisedTarget}</td>
                  <td className="px-3 py-2" style={{ color: row.active?"#16a34a":"#dc2626", fontWeight:600 }}>{row.active?"Active":"Inactive"}</td>
                  <td className="px-3 py-2"><span className={"px-2 py-0.5 rounded-full text-[10px] font-semibold " + st.bg + " " + st.color}>{st.emoji} {row.flag}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function PerfReportPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, targets] = await Promise.all([getOrgSettings(), getTransactions(), getTargets()])
  const year  = parseInt(sp.year  || String(new Date().getFullYear()))
  const month = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const thresholds = { exceeding: settings.perfThresholdExceeding, onTrack: settings.perfThresholdOnTrack, atRisk: settings.perfThresholdAtRisk }
  const perf = computePerformance(txs, targets, year, month, thresholds)
  const sym  = settings.currencySymbol
  const o    = perf.overall
  const flagStyle = PERFORMANCE_STYLES[o.flag]

  return (
    <div className="space-y-6">
      <ReportHeader settings={settings} title={`Performance Report`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Performance Report</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{month} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter years={years} year={year} month={month} />
          <PrintButton />
        </div>
      </div>
      {/* Overall */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Amount Collected",    value: formatCurrencyCompact(o.actualAmount, sym) },
          { label:"vs Revised Target",   value: formatPct(o.amountAchievementPct), flag: true },
          { label:"vs Annual Plan",      value: formatPct(o.amountVsAnnualPct) },
          { label:"Customers",           value: `${o.actualCount} / ${o.countRevisedTarget}` },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-4" style={{ background:"#fff", borderColor:"#bfdbfe" }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color:"#4b6a8f" }}>{k.label}</p>
            <p className="text-xl font-bold" style={{ color:"#0c1a2e" }}>{k.value}</p>
            {k.flag && <span className={"inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 " + flagStyle.bg + " " + flagStyle.color}>{flagStyle.emoji} {o.flag}</span>}
          </div>
        ))}
      </div>
      <Section title={settings.productLabel + " Breakdown"} rows={perf.byProduct} sym={sym} />
      <Section title={settings.gatewayLabel + " Breakdown"} rows={perf.byGateway} sym={sym} />
      <Section title={settings.regionLabel  + " Breakdown"} rows={perf.byRegion} sym={sym} />
      <Section title={settings.salesRepLabel + " Breakdown"} rows={perf.bySalesRep} sym={sym} />
    </div>
  )
}
