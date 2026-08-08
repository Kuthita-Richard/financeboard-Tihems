'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { generateInsightsAction } from '@/actions'

interface Props { years: number[]; months: string[]; defaultYear: number; defaultMonth: string }

export default function InsightsClient({ years, months, defaultYear, defaultMonth }: Props) {
  const [year, setYear]   = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(false)
  const [text, setText]       = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    const res = await generateInsightsAction(year, month)
    setLoading(false)
    if (res.success) setText(res.text ?? null)
    else setError(res.message)
  }

  const selCls = 'px-3 py-2 rounded-xl text-sm border outline-none focus:border-[var(--primary)]'
  const selStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>AI Insights</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          A written summary of what&apos;s driving performance in the period you choose, generated on demand.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={selCls} style={selStyle}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)} className={selCls} style={selStyle}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button type="button" onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Thinking…' : text ? 'Regenerate' : 'Generate Insights'}
        </button>
        {text && !loading && (
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

      {text && !error && (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} style={{ color: 'var(--primary)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              {month} {year}
            </p>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg)' }}>{text}</p>
        </div>
      )}

      {!text && !error && !loading && (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--muted-fg)', opacity: 0.5 }} />
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Pick a period and click Generate Insights.</p>
        </div>
      )}
    </div>
  )
}
