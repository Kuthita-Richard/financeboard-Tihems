import { getTransactions, getTargets, getOrgSettings } from '@/lib/sheets'
import { computeYTD } from '@/lib/performance'
import { MONTHS, formatCurrencyCompact, formatPct, getAvailableYears } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import TrendsChart from './TrendsChart'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Monthly Trends' }
export default async function TrendsPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs, targets] = await Promise.all([getOrgSettings(), getTransactions(), getTargets()])
  const year     = parseInt(sp.year || String(new Date().getFullYear()))
  const upToMonth = sp.month || MONTHS[new Date().getMonth()]
  const years = getAvailableYears(txs, targets)
  const ytd = computeYTD(txs, targets, year, upToMonth)
  const sym = settings.currencySymbol
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>Monthly Trends — {year}</h2>
          <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
            Year-to-date through {upToMonth} · Cumulative: {formatCurrencyCompact(ytd.cumulativeActual, sym)} vs {formatCurrencyCompact(ytd.cumulativeTarget, sym)} ({formatPct(ytd.achievementPct)})
          </p>
        </div>
        <PeriodFilter years={years} year={year} month={upToMonth} allowAll={false} />
      </div>
      <TrendsChart data={ytd.byMonth} sym={sym} />
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background:'#eff6ff', borderBottom:'1px solid #bfdbfe' }}>
              {['Month',`Actual (${sym})`,`Annual Plan`,`Revised Target`,'vs Revised','vs Annual Plan','Cumulative'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color:'#4b6a8f' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ytd.byMonth.map((row,i) => (
              <tr key={row.month} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                <td className="px-4 py-2.5 font-semibold" style={{ color:'#0c1a2e' }}>{row.month}</td>
                <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color:'#0284c7' }}>{formatCurrencyCompact(row.actual, sym)}</td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.annualTarget, sym)}</td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.revisedTarget, sym)}</td>
                <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color: row.achievementPct>=100?'#16a34a':'#dc2626' }}>{formatPct(row.achievementPct)}</td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color: row.annualTarget>0 && row.actual/row.annualTarget*100>=100?'#16a34a':'#d97706' }}>
                  {row.annualTarget > 0 ? formatPct(row.actual/row.annualTarget*100) : '—'}
                </td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{formatCurrencyCompact(row.cumulativeActual, sym)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
