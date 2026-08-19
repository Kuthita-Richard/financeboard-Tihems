'use client'

/**
 * RegionClient.tsx
 *
 * Shows a "Drilled through from: X" banner when arriving via chart click,
 * with a back button to return to the main dashboard — identical to
 * Power BI's drill-through back navigation.
 */
import { useRouter } from 'next/navigation'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { formatCurrencyCompact, formatPct, computePerformanceFlag, PERFORMANCE_STYLES } from '@/lib/utils'
import type { OrgSettings } from '@/types'
import { ArrowLeft } from 'lucide-react'

interface RegionRow {
  region: string; actual: number; target: number; variance: number
  variancePct: number; achievementPct: number; targetMetPct: number; recordCount: number
}
interface Props { data: RegionRow[]; settings: OrgSettings; drillFilter: string | null }

const Tip = ({ active, payload, label, sym }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]
  label?: string; sym: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl text-xs"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="font-bold mb-2" style={{ color: 'var(--fg)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span style={{ color: 'var(--muted-fg)' }}>{p.name}:</span>
          <strong style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(p.value, sym)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function RegionClient({ data, settings, drillFilter }: Props) {
  const router = useRouter()
  const sym    = settings.currencySymbol

  return (
    <div className="space-y-5">

      {/* Drill-through back banner */}
      {drillFilter && (
        <div className="flex items-center gap-3 p-3 rounded-xl border"
          style={{ background: 'color-mix(in oklch, var(--primary) 8%, transparent)', borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)' }}>
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'var(--primary)', color: 'white' }}>
            <ArrowLeft size={12} /> Back to Dashboard
          </button>
          <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
            Drilled through from: <strong>{drillFilter}</strong>
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
          {settings.regionLabel} Analysis
          {drillFilter && <span className="ml-2 text-base font-normal" style={{ color: 'var(--muted-fg)' }}>— {drillFilter}</span>}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Performance breakdown by {settings.regionLabel.toLowerCase()}.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No data for this selection.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-fg)' }}>
              Actual vs Target by {settings.regionLabel}
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="region" tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => formatCurrencyCompact(v, sym)} />
                <Tooltip content={<Tip sym={sym} />} />
                <Legend formatter={v => <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="actual" name="Actual Amount" fill="#2878d6" radius={[3,3,0,0]} barSize={28} />
                <Bar dataKey="target" name="Target Amount" fill="#a8c8f0" radius={[3,3,0,0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  {[settings.regionLabel, `Target (${sym})`, `Actual (${sym})`, 'Achievement', 'Variance', 'Records', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]"
                      style={{ color: 'var(--muted-fg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const { flag } = computePerformanceFlag(row.actual, row.target, {
                    exceeding: settings.perfThresholdExceeding,
                    onTrack:   settings.perfThresholdOnTrack,
                    atRisk:    settings.perfThresholdAtRisk,
                  })
                  const style = PERFORMANCE_STYLES[flag]
                  return (
                    <tr key={row.region}
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--fg)' }}>{row.region}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{formatCurrencyCompact(row.target, sym)}</td>
                      <td className="px-4 py-3 tabular-nums font-medium" style={{ color: 'var(--fg)' }}>{formatCurrencyCompact(row.actual, sym)}</td>
                      <td className="px-4 py-3 tabular-nums font-bold"
                        style={{ color: row.achievementPct >= 100 ? '#16a34a' : '#dc2626' }}>
                        {formatPct(row.achievementPct)}
                      </td>
                      <td className="px-4 py-3 tabular-nums"
                        style={{ color: row.variance >= 0 ? '#16a34a' : '#dc2626' }}>
                        {row.variance >= 0 ? '+' : ''}{formatCurrencyCompact(row.variance, sym)}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--muted-fg)' }}>{row.recordCount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.color}`}>
                          {style.emoji} {flag}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
