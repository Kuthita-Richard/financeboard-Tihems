import { getOrgSettings, getTransactions, getTargets, getSchemeDepartmentMap, getSchemeSalesRepMap } from "@/lib/sheets"
import { computePerformance } from "@/lib/performance"
import { MONTHS, formatCurrencyCompact, formatPct, PERFORMANCE_STYLES , getAvailableYears } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import type { Metadata } from "next"
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: "Executive Summary" }
export default async function ReportExecutivePage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams

  const [settings, txs, targets, schemeMap, salesRepMap] = await Promise.all([getOrgSettings(), getTransactions(), getTargets(), getSchemeDepartmentMap(), getSchemeSalesRepMap()])
  const year = parseInt(sp.year || String(new Date().getFullYear()))
  const month = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const thresholds = { exceeding: settings.perfThresholdExceeding, onTrack: settings.perfThresholdOnTrack, atRisk: settings.perfThresholdAtRisk }
  const perf = computePerformance(txs, targets, year, month, thresholds, undefined, schemeMap, salesRepMap)
  const sym = settings.currencySymbol
  const o   = perf.overall
  const topProduct  = perf.byProduct.sort((a,b)=>b.amountAchievementPct-a.amountAchievementPct)[0]
  const worstProduct = perf.byProduct.sort((a,b)=>a.amountAchievementPct-b.amountAchievementPct)[0]
  const topGateway  = perf.byGateway.sort((a,b)=>b.actualAmount-a.actualAmount)[0]
  const topRep      = perf.bySalesRep.sort((a,b)=>b.amountAchievementPct-a.amountAchievementPct)[0]
  const flagStyle   = PERFORMANCE_STYLES[o.flag]
  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`Executive Summary`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Executive Summary</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{month} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter years={years} year={year} month={month} />
          <PrintButton />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Amount Collected",  value: formatCurrencyCompact(o.actualAmount, sym) },
          { label:"vs Revised Target", value: formatPct(o.amountAchievementPct) },
          { label:"vs Annual Plan",    value: formatPct(o.amountVsAnnualPct) },
          { label:"Customers Served",  value: String(o.actualCount) },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-4" style={{ background:"#fff", borderColor:"#bfdbfe" }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color:"#4b6a8f" }}>{k.label}</p>
            <p className="text-2xl font-bold" style={{ color:"#0c1a2e" }}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background:"#fff", borderColor:"#bfdbfe" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:"#4b6a8f" }}>Overall Status</p>
          <div className="text-center">
            <p className="text-5xl font-extrabold tabular-nums mb-2" style={{ color:"#2878d6" }}>{formatPct(o.amountAchievementPct)}</p>
            <span className={"inline-block text-sm font-bold px-4 py-1 rounded-full " + flagStyle.bg + " " + flagStyle.color}>{flagStyle.emoji} {o.flag}</span>
          </div>
        </div>
        <div className="rounded-xl border p-5 space-y-3" style={{ background:"#fff", borderColor:"#bfdbfe" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"#4b6a8f" }}>Key Highlights</p>
          {topProduct && <div className="flex items-center justify-between p-2 rounded-lg" style={{ background:"#f0f9ff" }}>
            <span className="text-xs" style={{ color:"#4b6a8f" }}>Top {settings.productLabel}: <strong style={{ color:"#0c1a2e" }}>{topProduct.dimensionValue}</strong></span>
            <span className="text-xs font-bold" style={{ color:"#16a34a" }}>{formatPct(topProduct.amountAchievementPct)}</span>
          </div>}
          {worstProduct && <div className="flex items-center justify-between p-2 rounded-lg" style={{ background:"#fff7f7" }}>
            <span className="text-xs" style={{ color:"#4b6a8f" }}>Needs attention: <strong style={{ color:"#0c1a2e" }}>{worstProduct.dimensionValue}</strong></span>
            <span className="text-xs font-bold" style={{ color:"#dc2626" }}>{formatPct(worstProduct.amountAchievementPct)}</span>
          </div>}
          {topGateway && <div className="flex items-center justify-between p-2 rounded-lg" style={{ background:"#f0f9ff" }}>
            <span className="text-xs" style={{ color:"#4b6a8f" }}>Top {settings.gatewayLabel}: <strong style={{ color:"#0c1a2e" }}>{topGateway.dimensionValue}</strong></span>
            <span className="text-xs font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(topGateway.actualAmount, sym)}</span>
          </div>}
          {topRep && <div className="flex items-center justify-between p-2 rounded-lg" style={{ background:"#f0f9ff" }}>
            <span className="text-xs" style={{ color:"#4b6a8f" }}>Top {settings.salesRepLabel}: <strong style={{ color:"#0c1a2e" }}>{topRep.dimensionValue}</strong></span>
            <span className="text-xs font-bold" style={{ color:"#16a34a" }}>{formatPct(topRep.amountAchievementPct)}</span>
          </div>}
        </div>
      </div>
    </div>
  )
}
