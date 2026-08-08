'use client'

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { formatCurrencyCompact } from '@/lib/utils'
import type { OrgSettings } from '@/types'

interface TrendPoint { label: string; target: number; actual: number; achievementPct: number }
interface Props { data: TrendPoint[]; settings: OrgSettings }

const Tip = ({ active, payload, label, sym }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  sym: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl text-xs min-w-[160px]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="font-bold mb-2" style={{ color: 'var(--fg)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            <span style={{ color: 'var(--muted-fg)' }}>{p.name}</span>
          </div>
          <strong style={{ color: 'var(--fg)' }}>
            {p.name === 'Achievement %'
              ? `${Number(p.value).toFixed(1)}%`
              : formatCurrencyCompact(p.value, sym)}
          </strong>
        </div>
      ))}
    </div>
  )
}

export default function TrendsClient({ data, settings }: Props) {
  const sym = settings.currencySymbol

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Monthly Trends</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Actual vs Target over time with Achievement % trend line.
        </p>
      </div>

      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {data.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--muted-fg)' }}>
            <p className="text-sm">No data yet. Add records to see trends.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="amount" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrencyCompact(v, sym)} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 150]}
                tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip content={<Tip sym={sym} />} />
              <Legend formatter={v => <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>{v}</span>} />
              <Bar yAxisId="amount" dataKey="target" name="Target Amount"
                fill="#a8c8f0" radius={[3,3,0,0]} barSize={20} />
              <Bar yAxisId="amount" dataKey="actual" name="Actual Amount"
                fill="#2878d6" radius={[3,3,0,0]} barSize={20} />
              <Line yAxisId="pct" type="monotone" dataKey="achievementPct" name="Achievement %"
                stroke="#d97706" strokeWidth={2.5}
                dot={{ fill: '#d97706', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {['Period', `Target (${sym})`, `Actual (${sym})`, 'Achievement %'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]"
                    style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.label}
                  style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--fg)' }}>{row.label}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{formatCurrencyCompact(row.target, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(row.actual, sym)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-bold"
                    style={{ color: row.achievementPct >= 100 ? '#16a34a' : row.achievementPct >= 90 ? '#2878d6' : '#dc2626' }}>
                    {row.achievementPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
