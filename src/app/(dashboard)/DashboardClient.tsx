'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ComposedChart, Line,
} from 'recharts'
import { Target, DollarSign, Users, CheckCircle, Activity, TrendingUp, ChevronDown, MousePointerClick } from 'lucide-react'
import { formatCurrencyCompact, formatPct, PERFORMANCE_STYLES, MONTHS } from '@/lib/utils'
import { CURRENCIES } from '@/lib/currency'
import type { PerformanceRow, DashboardFilters, OrgSettings, OrgMetadata } from '@/types'

interface PerfData {
  overall:   PerformanceRow
  byProduct: PerformanceRow[]
  byGateway: PerformanceRow[]
  byRegion:  PerformanceRow[]
  bySalesRep:PerformanceRow[]
}

interface Props {
  perf:                   PerfData
  filters:                DashboardFilters
  settings:               OrgSettings
  metadata:               OrgMetadata
  years:                  string[]
  displayCurrency:        string
  baseCurrency:           string
  displaySymbol:          string
  exchangeRateUpdatedAt:  string | null
}

// ── Reusable tooltip ──────────────────────────────────────────
const ChartTip = ({ active, payload, label, sym, hint, isPercent = false }: {
  active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string; sym: string; hint?: string
  // True only for charts whose series are genuinely percentages (e.g. achievement %). Everything else here is
  // always a currency amount — including zero, which is exactly the case the old magnitude-guessing heuristic
  // (">100 = currency, else %") got wrong: a real KSh 0 "Actual" isn't greater than 100, so it rendered as
  // "0.0%" instead of "KSh0", which is what looked like a missing/broken bar.
  isPercent?: boolean
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 shadow-xl text-xs min-w-[150px]" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
      <p className="font-bold mb-2" style={{ color:'#0c1a2e' }}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background:p.color }} />
            <span style={{ color:'#4b6a8f' }}>{p.name}</span>
          </div>
          <strong style={{ color:'#0c1a2e' }}>
            {isPercent ? `${Number(p.value).toFixed(1)}%` : formatCurrencyCompact(p.value, sym)}
          </strong>
        </div>
      ))}
      {hint && <div className="flex items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor:'#e0f2fe' }}>
        <MousePointerClick size={10} style={{ color:'#0284c7' }} />
        <span className="text-[10px]" style={{ color:'#0284c7' }}>{hint}</span>
      </div>}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, accent }: {
  label:string; value:string; sub?:string; icon:React.ElementType; accent:string
}) => (
  <div className="rounded-xl border p-4 card-hover" style={{ background:'#fff', borderColor:'#bfdbfe', borderTop:`3px solid ${accent}` }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color:'#4b6a8f' }}>{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`${accent}18` }}>
        <Icon size={15} color={accent} />
      </div>
    </div>
    <p className="text-2xl font-bold tabular-nums" style={{ color:'#0c1a2e' }}>{value}</p>
    {sub && <p className="text-[10px] mt-1" style={{ color:'#4b6a8f' }}>{sub}</p>}
  </div>
)

// ── Filter select ─────────────────────────────────────────────
const Sel = ({ label, value, options, onChange, loading }: {
  label:string; value:string; options:string[]; onChange:(v:string)=>void; loading:boolean
}) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)} disabled={loading || options.length === 0}
      className="appearance-none border rounded-lg pl-3 pr-8 py-2 text-xs font-medium cursor-pointer outline-none disabled:opacity-40"
      style={{ background:'#fff', borderColor: value !== 'All' ? '#0284c7' : '#bfdbfe',
        color: value !== 'All' ? '#0284c7' : '#4b6a8f', minWidth:'100px',
        boxShadow: value !== 'All' ? '0 0 0 2px #dbeafe' : 'none' }}>
      <option value="All" style={{ color:'#0c1a2e' }}>{label}: All</option>
      {options.map(o => <option key={o} value={o} style={{ color:'#0c1a2e' }}>{o}</option>)}
    </select>
    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'#4b6a8f' }} />
  </div>
)

const Card = ({ title, subtitle, children }: { title:string; subtitle?:string; children:React.ReactNode }) => (
  <div className="rounded-xl border" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
    <div className="px-5 pt-4 pb-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#4b6a8f' }}>{title}</p>
      {subtitle && <p className="text-[10px] mt-0.5" style={{ color:'#4b6a8f' }}>{subtitle}</p>}
    </div>
    <div className="px-4 pb-4">{children}</div>
  </div>
)

export default function DashboardClient({
  perf, filters, settings, metadata, years,
  displayCurrency, baseCurrency, displaySymbol, exchangeRateUpdatedAt,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()
  const [pending, startTransition] = useTransition()
  const sym = displaySymbol
  const o   = perf.overall
  const isConverted = displayCurrency !== baseCurrency

  const updateFilter = useCallback((key: string, value: string) => {
    startTransition(() => {
      const p = new URLSearchParams(sp.toString())
      // Year/Month default to *today's* period when the URL param is absent
      // (see page.tsx), not to "All" — unlike Product/Gateway/Region/
      // SalesRep, which default to "All" when absent. So for those two,
      // "All" has to be written into the URL explicitly; deleting the param
      // would silently snap back to the current year/month instead.
      if (value === 'All' && key !== 'year' && key !== 'month') p.delete(key)
      else p.set(key, value)
      router.push(`${pathname}?${p.toString()}`)
    })
  }, [pathname, router, sp])

  const updateCurrency = useCallback((code: string) => {
    startTransition(() => {
      const p = new URLSearchParams(sp.toString())
      if (code === baseCurrency) p.delete('currency'); else p.set('currency', code)
      router.push(`${pathname}?${p.toString()}`)
    })
  }, [pathname, router, sp, baseCurrency])

  const hasFilters = Object.values(filters).some(v => v !== 'All')
  const resetAll   = () => startTransition(() => router.push(pathname))

  const drillTo = (dim: string, value: string) =>
    router.push(`/analysis/${dim}?value=${encodeURIComponent(value)}`)

  // Gauge data
  const gaugePct = Math.min(o.amountAchievementPct, 120)
  const gaugeData = [
    { name: 'Achieved',  value: Math.min(gaugePct, 100) },
    { name: 'Remaining', value: Math.max(0, 100 - gaugePct) },
  ]
  const flagStyle = PERFORMANCE_STYLES[o.flag]

  const PBI = { actual: '#2878d6', target: '#a8c8f0', revised: '#7dd3fc', pos: '#217346', neg: '#c0392b' }

  return (
    <div className="space-y-4">

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
        <Sel label="Year"              value={filters.year}    options={years}                   onChange={v => updateFilter('year',v)}    loading={pending} />
        <Sel label="Month"             value={filters.month}   options={MONTHS}                  onChange={v => updateFilter('month',v)}   loading={pending} />
        <Sel label={settings.productLabel}  value={filters.product}  options={metadata.products}  onChange={v => updateFilter('product',v)}  loading={pending} />
        <Sel label={settings.gatewayLabel}  value={filters.gateway}  options={metadata.gateways}  onChange={v => updateFilter('gateway',v)}  loading={pending} />
        <Sel label={settings.regionLabel}   value={filters.region}   options={metadata.regions}   onChange={v => updateFilter('region',v)}   loading={pending} />
        <Sel label={settings.salesRepLabel} value={filters.salesRep} options={metadata.salesReps} onChange={v => updateFilter('salesRep',v)} loading={pending} />

        {/* Currency selector */}
        <div className="relative ml-auto">
          <select value={displayCurrency} onChange={e => updateCurrency(e.target.value)} disabled={pending}
            className="appearance-none border-2 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold cursor-pointer outline-none"
            style={{ background: isConverted ? '#eff6ff' : '#fff',
              borderColor: isConverted ? '#0284c7' : '#bfdbfe',
              color: isConverted ? '#0284c7' : '#4b6a8f' }}>
            <optgroup label="── Base currency ──">
              {CURRENCIES.filter(c => c.code === baseCurrency).map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
              ))}
            </optgroup>
            <optgroup label="── Convert to ──">
              {CURRENCIES.filter(c => c.code !== baseCurrency).map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
              ))}
            </optgroup>
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'#4b6a8f' }} />
        </div>

        {hasFilters && <button onClick={resetAll} className="px-3 py-2 text-xs rounded-lg border hover:opacity-70"
          style={{ borderColor:'#bfdbfe', color:'#4b6a8f' }}>Reset</button>}
        {pending && <span className="text-xs" style={{ color:'#4b6a8f' }}>Updating…</span>}
      </div>

      {/* Currency notice */}
      {isConverted && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#0284c7' }}>
          💱 Values converted from <strong className="mx-1">{baseCurrency}</strong> to <strong className="mx-1">{displayCurrency}</strong>
          {exchangeRateUpdatedAt && ` · Updated: ${exchangeRateUpdatedAt.slice(0,16)}`}
          <button onClick={() => updateCurrency(baseCurrency)} className="ml-auto underline font-semibold">Reset</button>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPI label="Amount Collected" value={formatCurrencyCompact(o.actualAmount, sym)}          icon={DollarSign}  accent="#0284c7" />
        <KPI label="Annual Plan"      value={formatCurrencyCompact(o.amountAnnualTarget, sym)}    icon={Target}      accent="#6366f1" sub="Monthly plan" />
        <KPI label="Revised Target"   value={formatCurrencyCompact(o.amountRevisedTarget, sym)}   icon={TrendingUp}  accent="#0369a1" sub="This month" />
        <KPI label="vs Revised"       value={formatPct(o.amountAchievementPct)}                   icon={Activity}    accent={o.amountAchievementPct >= 100 ? '#16a34a' : '#dc2626'} sub={o.flag} />
        <KPI label="vs Annual Plan"   value={formatPct(o.amountVsAnnualPct)}                      icon={CheckCircle} accent={o.amountVsAnnualPct >= 100 ? '#16a34a' : '#d97706'} />
        <KPI label="Customers"        value={String(o.actualCount)}                               icon={Users}       accent="#16a34a" sub={`Target: ${o.countRevisedTarget}`} />
      </div>

      {/* ── Gauge + Payment Scheme variance + Hospital + Department ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Gauge */}
        <Card title="Achievement vs Revised Target">
          <div className="relative flex flex-col items-center">
            <PieChart width={230} height={130}>
              <Pie data={gaugeData} cx={115} cy={122} startAngle={180} endAngle={0}
                innerRadius={68} outerRadius={100} dataKey="value" strokeWidth={0}>
                <Cell fill={PBI.actual} />
                <Cell fill="#dbeafe" />
              </Pie>
            </PieChart>
            <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
              <p className="text-2xl font-extrabold tabular-nums" style={{ color:PBI.actual }}>{formatPct(o.amountAchievementPct)}</p>
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${flagStyle.bg} ${flagStyle.color}`}>
                {flagStyle.emoji} {o.flag}
              </span>
            </div>
          </div>
          <div className="flex justify-between px-6 mt-1">
            <span className="text-[10px]" style={{ color:'#4b6a8f' }}>0%</span>
            <span className="text-[10px]" style={{ color:'#4b6a8f' }}>100%</span>
          </div>
        </Card>

        {/* Payment Scheme variance — the primary dimension gets the variance treatment */}
        <Card title={`Variance % by ${settings.gatewayLabel}`} subtitle="Click bar to drill through">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perf.byGateway} margin={{ top:18, right:8, left:-22, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" vertical={false} />
              <XAxis dataKey="dimensionValue" tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip content={<ChartTip sym={sym} hint={`Click to see ${settings.gatewayLabel} details`} isPercent />} />
              <Bar dataKey="amountAchievementPct" name="Achievement %" radius={[3,3,0,0]} cursor="pointer" minPointSize={2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillTo('gateway', d.dimensionValue)}
                label={{ position:'top', fontSize:9, fill:'#4b6a8f', formatter:(v:unknown)=>`${Number(v).toFixed(1)}%` }}>
                {perf.byGateway.map((d,i) => <Cell key={i} fill={d.amountAchievementPct >= 100 ? PBI.pos : PBI.neg} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Hospital collection — moved here from where Payment Scheme used to sit */}
        <Card title={`${settings.regionLabel} Collection`} subtitle="Click bar to drill through">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perf.byRegion} layout="vertical" margin={{ top:0, right:50, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" horizontal={false} />
              <XAxis type="number" tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrencyCompact(v, sym)} />
              <YAxis type="category" dataKey="dimensionValue" width={60}
                tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip sym={sym} hint={`Click to see ${settings.regionLabel} details`} />} />
              <Bar dataKey="actualAmount" name="Collected" fill={PBI.actual} radius={[0,3,3,0]} cursor="pointer" minPointSize={2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillTo('region', d.dimensionValue)}
                label={{ position:'right', fontSize:9, fill:'#4b6a8f', formatter:(v:unknown)=>formatCurrencyCompact(Number(v), sym) }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Department collection — new, freed up now that Variance moved to Payment Scheme */}
        <Card title={`${settings.productLabel} Collection`} subtitle="Click bar to drill through">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perf.byProduct} layout="vertical" margin={{ top:0, right:50, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" horizontal={false} />
              <XAxis type="number" tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrencyCompact(v, sym)} />
              <YAxis type="category" dataKey="dimensionValue" width={60}
                tick={{ fill:'#4b6a8f', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip sym={sym} hint={`Click to see ${settings.productLabel} details`} />} />
              <Bar dataKey="actualAmount" name="Collected" fill={PBI.actual} radius={[0,3,3,0]} cursor="pointer" minPointSize={2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => drillTo('product', d.dimensionValue)}
                label={{ position:'right', fontSize:9, fill:'#4b6a8f', formatter:(v:unknown)=>formatCurrencyCompact(Number(v), sym) }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Payment Scheme actual vs targets — the primary dimension's full comparison ── */}
      <Card title={`Actual vs Targets by ${settings.gatewayLabel}`} subtitle="Click any bar to drill through">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={perf.byGateway} margin={{ top:12, right:24, left:12, bottom:0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" vertical={false} />
            <XAxis dataKey="dimensionValue" tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#4b6a8f', fontSize:11 }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrencyCompact(v, sym)} />
            <Tooltip content={<ChartTip sym={sym} hint="Click to drill through" />} />
            <Legend formatter={v => <span style={{ color:'#4b6a8f', fontSize:11 }}>{v}</span>} wrapperStyle={{ paddingTop:12 }} />
            <Bar dataKey="actualAmount"        name="Actual"         fill={PBI.actual}  radius={[3,3,0,0]} barSize={24} minPointSize={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cursor="pointer" onClick={(d:any)=>drillTo('gateway',d.dimensionValue)} />
            <Bar dataKey="amountRevisedTarget" name="Revised Target" fill={PBI.revised} radius={[3,3,0,0]} barSize={24} minPointSize={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cursor="pointer" onClick={(d:any)=>drillTo('gateway',d.dimensionValue)} opacity={0.8} />
            <Bar dataKey="amountAnnualTarget"  name="Annual Plan"    fill={PBI.target}  radius={[3,3,0,0]} barSize={24} minPointSize={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cursor="pointer" onClick={(d:any)=>drillTo('gateway',d.dimensionValue)} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Sales Rep leaderboard ──────────────────────────── */}
      <Card title={`${settings.salesRepLabel} Performance`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:600 }}>
            <thead>
              <tr style={{ background:'#eff6ff', borderBottom:'1px solid #bfdbfe' }}>
                {['#', settings.salesRepLabel, `Amount (${sym})`, 'Annual Plan', 'Revised Target', 'vs Revised', 'Customers', 'Cust. Target', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:'#4b6a8f' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perf.bySalesRep.map((row, i) => {
                const st = PERFORMANCE_STYLES[row.flag]
                return (
                  <tr key={row.dimensionValue} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                    <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color:'#4b6a8f' }}>{i+1}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color:'#0c1a2e' }}>{row.dimensionValue}</td>
                    <td className="px-3 py-2.5 tabular-nums font-medium" style={{ color:'#0c1a2e' }}>{formatCurrencyCompact(row.actualAmount, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.amountAnnualTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{formatCurrencyCompact(row.amountRevisedTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: row.amountAchievementPct>=100?'#16a34a':'#dc2626' }}>{formatPct(row.amountAchievementPct)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{row.actualCount}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{row.countRevisedTarget}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>{st.emoji} {row.flag}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
