'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/utils'
import type { OrgSettings, TargetRecord } from '@/types'

interface ResolutionStep {
  year: number; month: string; effectiveRow: TargetRecord | null
  contributedAnnual: number; contributedRevised: number
  contributedCountAnnual: number; contributedCountRevised: number
}
interface Props {
  result: { series: TargetRecord[]; resolution: ResolutionStep[] }
  leafType: 'Gateway' | 'SalesRep'; region: string; dimensionValue: string; year: number
  regions: string[]; gateways: string[]; salesReps: string[]; years: number[]
  settings: OrgSettings
}

export default function TargetDebugClient({ result, leafType, region, dimensionValue, year, regions, gateways, salesReps, years, settings }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const sym = settings.currencySymbol

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    // Changing dimension type invalidates whatever value was selected for the other type.
    if (key === 'type') p.delete('value')
    startTransition(() => router.push(`${pathname}?${p.toString()}`))
  }, [pathname, router, searchParams])

  const selCls = 'px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--primary)]'
  const selStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }
  const valueOptions = leafType === 'Gateway' ? gateways : salesReps

  // Fully pure — no mutation anywhere, even of a value scoped to this
  // render. React Compiler flags any reassignment during render, including
  // a local accumulator, not just state — reduce returning a brand new
  // array each step avoids that entirely.
  const runningTotals = result.resolution.reduce<number[]>((acc, step) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0
    return [...acc, prev + step.contributedRevised]
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Target Debug</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Pick an exact series (a Hospital + Payment Scheme or Sales Rep pair) and see precisely which target row
          carry-forward resolves as &quot;current&quot; for each month, and what it contributes to every total that
          depends on it. If a number elsewhere in the app looks wrong, this is where to trace it to the exact row.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={leafType} disabled={pending} onChange={e => update('type', e.target.value)} className={selCls} style={selStyle}>
          <option value="Gateway">{settings.gatewayLabel}</option>
          <option value="SalesRep">{settings.salesRepLabel}</option>
        </select>
        <select value={region} disabled={pending} onChange={e => update('region', e.target.value)} className={selCls} style={selStyle}>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={dimensionValue} disabled={pending} onChange={e => update('value', e.target.value)} className={selCls} style={selStyle}>
          {valueOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={year} disabled={pending} onChange={e => update('year', e.target.value)} className={selCls} style={selStyle}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Raw rows actually entered for this series */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--muted)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Every target row ever entered for {region} · {dimensionValue}
          </p>
        </div>
        {result.series.length === 0 ? (
          <p className="px-4 py-6 text-sm italic" style={{ color: 'var(--muted-fg)' }}>
            No target row exists for this series at all — every month will show &quot;Unresolved&quot; below.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Year', 'Month', 'Annual', 'Revised', 'Active'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--muted-fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.series.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-2">{t.year}</td>
                  <td className="px-3 py-2">{t.month}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrencyCompact(t.amountAnnualTarget, sym)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrencyCompact(t.amountRevisedTarget, sym)}</td>
                  <td className="px-3 py-2">{t.active ? '✅ Active' : '⛔ Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Month-by-month carry-forward resolution */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--muted)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Month-by-month resolution for {year}
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Month', 'Effective row set in', 'Active', 'Contributes (Annual)', 'Contributes (Revised)', 'Running total (Revised)'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--muted-fg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.resolution.map((step, i) => {
              return (
                <tr key={step.month} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 font-medium">{step.month}</td>
                  <td className="px-3 py-2">
                    {step.effectiveRow
                      ? `${step.effectiveRow.month} ${step.effectiveRow.year}`
                      : <span className="italic" style={{ color: 'var(--muted-fg)' }}>Unresolved — nothing set yet</span>}
                  </td>
                  <td className="px-3 py-2">
                    {!step.effectiveRow ? '—' : step.effectiveRow.active ? '✅' : (
                      <span className="inline-flex items-center gap-1" style={{ color: '#b45309' }}>
                        <AlertTriangle size={11} /> Inactive — contributes 0
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatCurrencyCompact(step.contributedAnnual, sym)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold">{formatCurrencyCompact(step.contributedRevised, sym)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color: 'var(--primary)' }}>{formatCurrencyCompact(runningTotals[i], sym)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
