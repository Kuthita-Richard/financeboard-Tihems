/**
 * lib/performance.ts — Pure computation layer
 *
 * Joins TransactionRecords against TargetRecords for a given period/dimension.
 * Called by dashboard page, analysis pages, and all report pages.
 * Never stored — always computed fresh from source data.
 */
import type {
  TransactionRecord, TargetRecord,
  PerformanceRow, DimensionType
} from '@/types'
import { computePerformanceFlag } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export interface PerfFilters {
  year?:    number | 'All'
  month?:   string   // 'All' (or omitted) means every month in the year
  product?: string   // 'All' (or omitted) means no restriction
  gateway?: string
  region?:  string
  salesRep?:string
  status?:  string
}

/** True if a filter value means "no restriction" — either unset or the literal 'All'. */
function isOpen(v?: string): boolean {
  return !v || v === 'All'
}

// ── Filter transactions ───────────────────────────────────────
// Applies every dimension filter (year, month, product, gateway, region,
// salesRep, status) that has a real value. 'All' / undefined = no restriction
// on that dimension. This is the ONLY place dimension filtering happens —
// every page (Dashboard, Analysis, Reports) should route through this so a
// filter selected anywhere always affects what's actually shown.
export function filterTransactions(
  txs: TransactionRecord[],
  f:   PerfFilters
): TransactionRecord[] {
  return txs.filter(r => {
    if (f.year && f.year !== 'All' && r.year !== f.year) return false
    if (!isOpen(f.month)    && r.month    !== f.month)    return false
    if (!isOpen(f.product)  && r.product  !== f.product)  return false
    if (!isOpen(f.gateway)  && r.gateway  !== f.gateway)  return false
    if (!isOpen(f.region)   && r.region   !== f.region)   return false
    if (!isOpen(f.salesRep) && r.salesRep !== f.salesRep) return false
    if (!isOpen(f.status)   && r.status   !== f.status)   return false
    return true
  })
}

// ── Find matching target ──────────────────────────────────────
export function findTarget(
  targets: TargetRecord[],
  year: number, month: string,
  dimensionType: DimensionType,
  dimensionValue: string
): TargetRecord | null {
  return targets.find(t =>
    t.year          === year &&
    t.month         === month &&
    t.dimensionType === dimensionType &&
    t.dimensionValue === dimensionValue
  ) ?? null
}

/**
 * Build one performance row by summing actuals across `periodTxs` and
 * summing targets across every (year, month) combination in `periods` —
 * each period's own Revised/Annual target is added, never multiplied. A
 * period with no target row, or a dimension marked Inactive for that
 * period, contributes 0 for that period only.
 *
 * This single function replaces the old single-month exact-match path and
 * the year-aggregate path — both are just this with a different `periods`
 * list: [[year,month]] for a specific month, or every month of one year
 * for that year's "All", or every (year,month) actually present for
 * "Year: All".
 */
function buildAggregateRow(
  displayYear: number | 'All', displayMonth: string,
  dimensionType: DimensionType, dimensionValue: string,
  periodTxs: TransactionRecord[],   // already filtered to this dimension value + Active status + the relevant years/months
  targets:   TargetRecord[],        // full target list — this function does its own (year,month) matching
  periods:   [number, string][],    // every (year, month) pair being summed
  thresholds: { exceeding: number; onTrack: number; atRisk: number }
): PerformanceRow {
  let amtAnnual = 0, amtRevised = 0, cntAnnual = 0, cntRevised = 0

  periods.forEach(([y, m]) => {
    const t = targets.find(x => x.year === y && x.month === m && x.dimensionType === dimensionType && x.dimensionValue === dimensionValue)
    if (!t || !t.active) return   // no target row, or Inactive that period → contributes 0
    amtAnnual  += t.amountAnnualTarget
    amtRevised += t.amountRevisedTarget
    cntAnnual  += t.countAnnualTarget
    cntRevised += t.countRevisedTarget
  })

  const actualAmount = periodTxs.reduce((s, r) => s + r.amountPaid, 0)
  const actualCount  = periodTxs.length

  const { flag, achievementPct: amtAch, variance: amtVar } =
    computePerformanceFlag(actualAmount, amtRevised, thresholds)
  const { achievementPct: amtVsAnnual } =
    computePerformanceFlag(actualAmount, amtAnnual, thresholds)
  const { achievementPct: cntAch, variance: cntVar } =
    computePerformanceFlag(actualCount, cntRevised, thresholds)

  return {
    year: displayYear === 'All' ? 0 : displayYear, month: displayMonth, dimensionType, dimensionValue,
    amountAnnualTarget: amtAnnual, amountRevisedTarget: amtRevised,
    actualAmount, amountVariance: amtVar, amountAchievementPct: amtAch, amountVsAnnualPct: amtVsAnnual,
    countAnnualTarget: cntAnnual, countRevisedTarget: cntRevised,
    actualCount, countVariance: cntVar, countAchievementPct: cntAch,
    active: true, flag,
  }
}

// ── Compute performance for a period ─────────────────────────
// year: 'All' aggregates every year present in the data. month: 'All'
// aggregates every month of the selected year(s). Any combination of the
// two works — e.g. year=2026 + month='All' sums 2026's 12 months; year='All'
// + month='August' sums every August across every year; year='All' +
// month='All' is an all-time total.
// Also applies the product/gateway/region/salesRep filters if given, so a
// filter picked on any page actually narrows the numbers shown, not just
// the URL.
export function computePerformance(
  txs:       TransactionRecord[],
  targets:   TargetRecord[],
  year:      number | 'All',
  month:     string,
  thresholds: { exceeding: number; onTrack: number; atRisk: number },
  dimFilters?: Pick<PerfFilters, 'product' | 'gateway' | 'region' | 'salesRep'>
): {
  overall:  PerformanceRow
  byProduct: PerformanceRow[]
  byGateway: PerformanceRow[]
  byRegion:  PerformanceRow[]
  bySalesRep:PerformanceRow[]
} {
  const isAllMonths = isOpen(month)
  const isAllYears  = year === 'All'

  // Base set: the selected year(s), Active status, plus any dimension filters.
  const yearTxs = filterTransactions(txs, {
    year, status: 'Active',
    product: dimFilters?.product, gateway: dimFilters?.gateway,
    region: dimFilters?.region, salesRep: dimFilters?.salesRep,
  })
  const periodTxs = isAllMonths ? yearTxs : yearTxs.filter(r => r.month === month)

  // Every (year, month) pair whose target should be summed. When a specific
  // year is picked, restrict to that year even if 'All' months are wanted —
  // so "2025, All months" doesn't accidentally pull in 2026's targets too.
  const years = isAllYears
    ? [...new Set([...txs.map(t => t.year), ...targets.map(t => t.year)])]
    : [year]
  const months = isAllMonths ? MONTHS : [month]
  const periods: [number, string][] = years.flatMap(y => months.map(m => [y, m] as [number, string]))

  const relevantTargets = isAllYears ? targets : targets.filter(t => years.includes(t.year))

  const overall = buildAggregateRow(year, month, 'Overall', 'Overall', periodTxs, relevantTargets, periods, thresholds)

  function byDim(dimType: DimensionType, groupFn: (r: TransactionRecord) => string): PerformanceRow[] {
    const dimTargets = relevantTargets.filter(t => t.dimensionType === dimType)
    const values = new Set<string>([...periodTxs.map(groupFn), ...dimTargets.map(t => t.dimensionValue)])
    return [...values].map(v =>
      buildAggregateRow(year, month, dimType, v, periodTxs.filter(r => groupFn(r) === v), relevantTargets, periods, thresholds)
    ).sort((a, b) => b.amountAchievementPct - a.amountAchievementPct)
  }

  return {
    overall,
    byProduct:  byDim('Product',  r => r.product),
    byGateway:  byDim('Gateway',  r => r.gateway),
    byRegion:   byDim('Region',   r => r.region),
    bySalesRep: byDim('SalesRep', r => r.salesRep),
  }
}

// ── Year-to-date computation ──────────────────────────────────
export function computeYTD(
  txs: TransactionRecord[],
  targets: TargetRecord[],
  year: number,
  upToMonth: string,   // include Jan through this month
): {
  cumulativeActual: number
  cumulativeTarget: number
  achievementPct:   number
  byMonth: { month: string; actual: number; annualTarget: number; revisedTarget: number; achievementPct: number; cumulativeActual: number }[]
} {
  const MONTHS_ORDER = ['January','February','March','April','May','June',
    'July','August','September','October','November','December']
  // Defensive: an unrecognized value (e.g. a stale 'All' from a bookmarked
  // URL — this page doesn't offer that option) falls back to the full year
  // rather than silently rendering nothing.
  const foundIdx = MONTHS_ORDER.indexOf(upToMonth)
  const upToIdx  = foundIdx === -1 ? 11 : foundIdx

  let cumulativeActual = 0
  let cumulativeTarget = 0

  const byMonth = MONTHS_ORDER.slice(0, upToIdx + 1).map(month => {
    const monthTxs    = txs.filter(r => r.year === year && r.month === month && r.status === 'Active')
    const overallTgt  = findTarget(targets, year, month, 'Overall', 'Overall')
    const actual      = monthTxs.reduce((s, r) => s + r.amountPaid, 0)
    const annualTgt   = overallTgt?.amountAnnualTarget  ?? 0
    const revisedTgt  = overallTgt?.amountRevisedTarget ?? 0
    const ach         = revisedTgt > 0 ? (actual / revisedTgt) * 100 : 0
    cumulativeActual += actual
    cumulativeTarget += revisedTgt
    return { month, actual, annualTarget: annualTgt, revisedTarget: revisedTgt, achievementPct: ach, cumulativeActual }
  })

  const achievementPct = cumulativeTarget > 0 ? (cumulativeActual / cumulativeTarget) * 100 : 0
  return { cumulativeActual, cumulativeTarget, achievementPct, byMonth }
}

// ── Customer summary (no targets — informational only) ────────
export interface CustomerSummary {
  customerName:   string
  totalAmount:    number
  totalCount:     number
  topProduct:     string
  topGateway:     string
  topSalesRep:    string
  lastTransaction:string
  regions:        string[]
}

export function computeCustomerSummary(
  txs: TransactionRecord[],
  filters?: PerfFilters
): CustomerSummary[] {
  const filtered = filters ? filterTransactions(txs, filters) : txs
  const map      = new Map<string, {
    amount: number; count: number
    products: Map<string,number>; gateways: Map<string,number>; reps: Map<string,number>
    regions: Set<string>; lastDate: string
  }>()

  filtered.forEach(r => {
    const key = r.customerName || '(Unknown)'
    const c   = map.get(key) ?? {
      amount: 0, count: 0,
      products: new Map(), gateways: new Map(), reps: new Map(),
      regions: new Set<string>(), lastDate: '',
    }
    c.amount += r.amountPaid; c.count++
    c.products.set(r.product,  (c.products.get(r.product)  ?? 0) + r.amountPaid)
    c.gateways.set(r.gateway,  (c.gateways.get(r.gateway)  ?? 0) + r.amountPaid)
    c.reps.set(r.salesRep,     (c.reps.get(r.salesRep)     ?? 0) + r.amountPaid)
    c.regions.add(r.region)
    if (!c.lastDate || r.date > c.lastDate) c.lastDate = r.date
    map.set(key, c)
  })

  const top = (m: Map<string,number>) => [...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—'

  return [...map.entries()].map(([customerName, d]) => ({
    customerName,
    totalAmount:     d.amount,
    totalCount:      d.count,
    topProduct:      top(d.products),
    topGateway:      top(d.gateways),
    topSalesRep:     top(d.reps),
    lastTransaction: d.lastDate,
    regions:         [...d.regions].sort(),
  })).sort((a, b) => b.totalAmount - a.totalAmount)
}
