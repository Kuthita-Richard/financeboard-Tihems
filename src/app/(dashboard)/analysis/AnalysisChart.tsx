'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { formatCurrencyCompact } from '@/lib/utils'
import type { PerformanceRow } from '@/types'

interface Props { rows: PerformanceRow[]; sym: string }

export default function AnalysisChart({ rows, sym }: Props) {
  if (!rows.length) return null
  return (
    <div className="rounded-xl border p-5" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:'#4b6a8f' }}>
        Actual vs Targets
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows.map(r => ({ name: r.dimensionValue, actual: r.actualAmount, revised: r.amountRevisedTarget, annual: r.amountAnnualTarget, ach: r.amountAchievementPct }))}
          margin={{ top:10, right:20, left:10, bottom:0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" vertical={false} />
          <XAxis dataKey="name" tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, sym)} />
          <Tooltip formatter={(v: unknown, name: unknown) => [formatCurrencyCompact(Number(v), sym), String(name ?? '')]} contentStyle={{ background:'#fff', border:'1px solid #bfdbfe', borderRadius:12 }} />
          <Legend formatter={v => <span style={{ color:'#4b6a8f', fontSize:11 }}>{v}</span>} />
          <Bar dataKey="actual"  name="Actual"         barSize={22} radius={[3,3,0,0]}>
            {rows.map((r,i) => <Cell key={i} fill={r.amountAchievementPct >= 100 ? '#2878d6' : '#dc2626'} />)}
          </Bar>
          <Bar dataKey="revised" name="Revised Target"  fill="#7dd3fc" barSize={22} radius={[3,3,0,0]} opacity={0.8} />
          <Bar dataKey="annual"  name="Annual Plan"     fill="#a8c8f0" barSize={22} radius={[3,3,0,0]} opacity={0.5} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
