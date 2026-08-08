'use client'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { formatCurrencyCompact, formatPct } from '@/lib/utils'

interface Props { data: { month: string; actual: number; annualTarget: number; revisedTarget: number; achievementPct: number }[]; sym: string }

export default function TrendsChart({ data, sym }: Props) {
  if (!data.length) return null
  return (
    <div className="rounded-xl border p-5" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color:'#4b6a8f' }}>
        Actual vs Targets with Achievement % Trend
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top:10, right:30, left:10, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" vertical={false} />
          <XAxis dataKey="month" tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={m => m.slice(0,3)} />
          <YAxis yAxisId="amt" tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrencyCompact(v, sym)} />
          <YAxis yAxisId="pct" orientation="right" domain={[0,150]} tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
          <Tooltip formatter={(v:unknown, name:unknown) => [
            name === 'Achievement %' ? formatPct(Number(v)) : formatCurrencyCompact(Number(v), sym), String(name ?? '')
          ]} contentStyle={{ background:'#fff', border:'1px solid #bfdbfe', borderRadius:12 }} />
          <Legend formatter={v => <span style={{ color:'#4b6a8f', fontSize:11 }}>{v}</span>} />
          <Bar yAxisId="amt" dataKey="actual"        name="Actual"         fill="#2878d6" barSize={20} radius={[3,3,0,0]} />
          <Bar yAxisId="amt" dataKey="revisedTarget"  name="Revised Target"  fill="#7dd3fc" barSize={20} radius={[3,3,0,0]} opacity={0.8} />
          <Bar yAxisId="amt" dataKey="annualTarget"   name="Annual Plan"     fill="#a8c8f0" barSize={20} radius={[3,3,0,0]} opacity={0.5} />
          <Line yAxisId="pct" type="monotone" dataKey="achievementPct" name="Achievement %"
            stroke="#d97706" strokeWidth={2.5} dot={{ fill:'#d97706', r:4, strokeWidth:0 }} activeDot={{ r:6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
