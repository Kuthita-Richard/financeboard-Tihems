import { getTransactions, getTargets, getOrgSettings } from "@/lib/sheets"
import { computeYTD } from "@/lib/performance"
import { MONTHS, formatCurrencyCompact, formatPct, getAvailableYears } from "@/lib/utils"
import PeriodFilter from '@/components/ui/PeriodFilter'
import type { Metadata } from "next"
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: "Year-to-Date Report" }
export default async function YTDPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, targets] = await Promise.all([getOrgSettings(), getTransactions(), getTargets()])
  const year     = parseInt(sp.year || String(new Date().getFullYear()))
  const upToMonth = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const ytd = computeYTD(txs, targets, year, upToMonth)
  const sym = settings.currencySymbol
  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`Year-to-Date — ${year}`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Year-to-Date — {year}</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>
            Through {upToMonth} · Cumulative: {formatCurrencyCompact(ytd.cumulativeActual, sym)} vs {formatCurrencyCompact(ytd.cumulativeTarget, sym)} · {formatPct(ytd.achievementPct)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter years={years} year={year} month={upToMonth} allowAll={false} />
          <PrintButton />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Cumulative Actual",  value: formatCurrencyCompact(ytd.cumulativeActual, sym) },
          { label:"Cumulative Target",  value: formatCurrencyCompact(ytd.cumulativeTarget, sym) },
          { label:"YTD Achievement",    value: formatPct(ytd.achievementPct) },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-4" style={{ background:"#fff", borderColor:"#bfdbfe" }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color:"#4b6a8f" }}>{k.label}</p>
            <p className="text-xl font-bold" style={{ color:"#0c1a2e" }}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
              {["Month",`Monthly Actual`,`Annual Plan`,`Revised Target`,"vs Revised","vs Annual Plan",`Cumulative Actual`,"Cumulative Target"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:"#4b6a8f" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ytd.byMonth.map((r,i) => {
              const cumulativeTarget = ytd.byMonth.slice(0,i+1).reduce((s,m)=>s+m.revisedTarget,0)
              const vsAnnual = r.annualTarget > 0 ? formatPct(r.actual/r.annualTarget*100) : "—"
              return (
                <tr key={r.month} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color:"#0c1a2e" }}>{r.month}</td>
                  <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(r.actual, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(r.annualTarget, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(r.revisedTarget, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color: r.achievementPct>=100?"#16a34a":"#dc2626" }}>{formatPct(r.achievementPct)}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: r.annualTarget>0&&r.actual/r.annualTarget*100>=100?"#16a34a":"#d97706" }}>{vsAnnual}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color:"#0c1a2e" }}>{formatCurrencyCompact(r.cumulativeActual, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color:"#4b6a8f" }}>{formatCurrencyCompact(cumulativeTarget, sym)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
