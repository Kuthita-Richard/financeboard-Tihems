import { formatCurrencyCompact, formatPct, PERFORMANCE_STYLES } from '@/lib/utils'
import type { PerformanceRow } from '@/types'

interface Props { rows: PerformanceRow[]; sym: string; dimLabel: string }

export default function AnalysisTable({ rows, sym, dimLabel }: Props) {
  if (!rows.length) return (
    <div className="rounded-xl border p-12 text-center" style={{ borderColor:'#bfdbfe' }}>
      <p className="text-sm" style={{ color:'#4b6a8f' }}>No data for this period.</p>
    </div>
  )
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth:800 }}>
          <thead>
            <tr style={{ background:'#eff6ff', borderBottom:'1px solid #bfdbfe' }}>
              {['#', dimLabel, `Actual (${sym})`, `Annual Plan`, `Revised Target`, 'vs Revised', 'vs Annual Plan', 'Customers', 'Cust.Target', 'Active', 'Status'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:'#4b6a8f' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const st = PERFORMANCE_STYLES[row.flag]
              return (
                <tr key={`${row.dimensionValue}-${i}`} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color:'#4b6a8f' }}>{i+1}</td>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color:'#0c1a2e' }}>{row.dimensionValue}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium" style={{ color:'#0c1a2e' }}>{formatCurrencyCompact(row.actualAmount, sym)}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.amountAnnualTarget, sym)}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.amountRevisedTarget, sym)}</td>
                  <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: row.amountAchievementPct>=100?'#16a34a':'#dc2626' }}>{formatPct(row.amountAchievementPct)}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color: row.amountVsAnnualPct>=100?'#16a34a':'#d97706' }}>{formatPct(row.amountVsAnnualPct)}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{row.actualCount}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{row.countRevisedTarget}</td>
                  <td className="px-3 py-2.5" style={{ color: row.active?'#16a34a':'#dc2626', fontWeight:600 }}>{row.active ? 'Active' : 'Inactive'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>{st.emoji} {row.flag}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
