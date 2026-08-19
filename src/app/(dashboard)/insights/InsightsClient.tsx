'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertTriangle, AlertCircle, TrendingUp, Circle } from 'lucide-react'
import { generateInsightsAction } from '@/actions'

interface InsightPoint { text: string; severity: 'critical' | 'warning' | 'positive' | 'neutral' }
interface Props { years: number[]; months: string[]; defaultYear: number; defaultMonth: string }

const SEVERITY_STYLE: Record<InsightPoint['severity'], { icon: typeof Circle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  warning:  { icon: AlertCircle,   color: '#b45309', bg: '#fffbeb' },
  positive: { icon: TrendingUp,    color: '#15803d', bg: '#f0fdf4' },
  neutral:  { icon: Circle,        color: 'var(--muted-fg)', bg: 'var(--muted)' },
}

export default function InsightsClient({ years, months, defaultYear, defaultMonth }: Props) {
  const [year, setYear]   = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<InsightPoint[] | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    const res = await generateInsightsAction(year, month)
    setLoading(false)
    if (res.success) setInsights(res.insights ?? null)
    else setError(res.message)
  }

  const selCls = 'px-3 py-2 rounded-xl text-sm border outline-none focus:border-[var(--primary)]'
  const selStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>AI Insights</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          A critical read of what&apos;s actually driving — or dragging down — performance in the period you choose.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={selCls} style={selStyle}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)} className={selCls} style={selStyle}>
          {months.map(m => <option key={m} value={m}>{m === 'All' ? 'All months (full year)' : m}</option>)}
        </select>
        <button type="button" onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Thinking…' : insights ? 'Regenerate' : 'Generate Insights'}
        </button>
        {insights && !loading && (
          <button type="button" onClick={generate}
            className="flex items-center gap-1.5 text-xs hover:opacity-70" style={{ color: 'var(--muted-fg)' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {insights && !error && (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} style={{ color: 'var(--primary)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              {month === 'All' ? `Full year ${year}` : `${month} ${year}`}
            </p>
          </div>
          <ul className="space-y-3">
            {insights.map((point, i) => {
              const { icon: Icon, color, bg } = SEVERITY_STYLE[point.severity] ?? SEVERITY_STYLE.neutral
              return (
                <li key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: bg }}>
                  <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{point.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!insights && !error && !loading && (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }} />
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Pick a period and click Generate Insights.</p>
        </div>
      )}
    </div>
  )
}
