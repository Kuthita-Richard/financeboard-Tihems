'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { MONTHS_WITH_ALL } from '@/lib/utils'

interface Props {
  years: number[]
  year: string      // 'All' or a year, as a string (URL param)
  month: string
  region: string
  department: string
  regionLabel: string
  productLabel: string
  regions: string[]
  departments: string[]
}

const selCls = 'appearance-none border rounded-lg pl-3 pr-8 py-2 text-xs font-medium cursor-pointer outline-none disabled:opacity-40'
const selStyle = { background: '#fff', borderColor: '#0284c7', color: '#0284c7' }

// Hoisted to module scope — defining a component inside another component's
// render body resets its state on every render, which React Compiler
// correctly flags as an error, not just a style nit.
function Dropdown({ label, value, options, onChange, pending, minWidth = 110 }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; pending: boolean; minWidth?: number
}) {
  return (
    <div className="relative">
      <select value={value} disabled={pending} onChange={e => onChange(e.target.value)}
        className={selCls} style={{ ...selStyle, minWidth }}>
        <option value="All">{label}: All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4b6a8f' }} />
    </div>
  )
}

export default function DeptReportFilters({
  years, year, month, region, department, regionLabel, productLabel, regions, departments,
}: Props) {
  const router       = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    startTransition(() => router.push(`${pathname}?${p.toString()}`))
  }, [pathname, router, searchParams])

  return (
    <div className="flex items-center gap-2 flex-wrap no-print">
      <Dropdown label="Year" value={year} options={years.map(String)} onChange={v => update('year', v)} pending={pending} minWidth={90} />
      <div className="relative">
        <select value={month} disabled={pending} onChange={e => update('month', e.target.value)}
          className={selCls} style={{ ...selStyle, minWidth: 110 }}>
          {MONTHS_WITH_ALL.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4b6a8f' }} />
      </div>
      <Dropdown label={regionLabel} value={region} options={regions} onChange={v => update('region', v)} pending={pending} />
      <Dropdown label={productLabel} value={department} options={departments} onChange={v => update('department', v)} pending={pending} />
    </div>
  )
}
