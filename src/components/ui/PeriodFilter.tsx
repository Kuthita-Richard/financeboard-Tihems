'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { MONTHS, MONTHS_WITH_ALL } from '@/lib/utils'

interface Props {
  years: number[]
  year: number
  month: string
  /** Set to false on pages (like Trends/YTD) that only filter by year, not month. */
  showMonth?: boolean
  /**
   * Set to false on pages built around "through month X" cumulative logic
   * (Trends, YTD) where "All" isn't a meaningful selection — those pages
   * already show the full year broken out by month.
   */
  allowAll?: boolean
}

export default function PeriodFilter({ years, year, month, showMonth = true, allowAll = true }: Props) {
  const router      = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    startTransition(() => router.push(`${pathname}?${p.toString()}`))
  }, [pathname, router, searchParams])

  const selCls = 'appearance-none border rounded-lg pl-3 pr-8 py-2 text-xs font-medium cursor-pointer outline-none disabled:opacity-40'

  return (
    <div className="flex items-center gap-2 no-print">
      <div className="relative">
        <select value={year} disabled={pending}
          onChange={e => update('year', e.target.value)}
          className={selCls} style={{ background: '#fff', borderColor: '#0284c7', color: '#0284c7', minWidth: 90 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4b6a8f' }} />
      </div>
      {showMonth && (
        <div className="relative">
          <select value={month} disabled={pending}
            onChange={e => update('month', e.target.value)}
            className={selCls} style={{ background: '#fff', borderColor: '#0284c7', color: '#0284c7', minWidth: 110 }}>
            {(allowAll ? MONTHS_WITH_ALL : MONTHS).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4b6a8f' }} />
        </div>
      )}
    </div>
  )
}
