/**
 * lib/performance.ts — Pure computation layer
 *
 * Joins TransactionRecords against TargetRecords for a given period/dimension.
 * Called by dashboard page, analysis pages, and all report pages.
 * Never stored — always computed fresh from source data.
 *
 * Target model (see docs/TARGETS_MODEL.md): Payment Scheme (Gateway) is the
 * ONLY dimension targets are actually entered against, always scoped to a
 * specific Region (hospital/branch) — e.g. "SHA Scheme at Masinga = 50,000".
 * Every other dimension is computed by summing the relevant Gateway target
 * rows — none of them are ever entered directly:
 *   - Overall    = every Gateway target, across every region
 *   - Region     = that region's own Gateway targets
 *   - Department = every Gateway target whose scheme is mapped to that
 *                  department, across regions
 *   - Sales Rep  = every Gateway target whose scheme is mapped to that
 *                  rep, across regions
 * Both the Department and Sales Rep mappings are INFERRED automatically
 * from transaction history (whichever department/rep a scheme has most
 * often been recorded under) — a manual entry in SchemeDepartmentMapping /
 * SchemeSalesRepMapping always overrides the inferred value when one
 * exists, e.g. to fix a wrong inference or to pre-classify a brand-new
 * scheme that has no transaction history yet.
 *
 * Carry-forward: a Payment Scheme (or Sales Rep) target holds for every
 * subsequent month until a newer row for that same (region, scheme)
 * series replaces it — you don't re-enter an unchanged target every
 * month. This includes Inactive status: marking a target Inactive also
 * carries forward until a newer row reactivates or replaces it. See
 * sumLeafTargets() below and docs/TARGETS_MODEL.md.
 */
import type {
  TransactionRecord, TargetRecord, SchemeDepartmentMapping, SchemeSalesRepMapping,
  PerformanceRow, DimensionType
} from '@/types'
import { computePerformanceFlag } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

/**
 * Infers each Payment Scheme's Department from transaction history: the
 * department it's been recorded under most often wins. Built from ALL
 * transactions regardless of the current period filter — a scheme's
 * department is a structural fact about the business, not something that
 * should flicker depending on which month happens to be selected on
 * screen. Ties broken by whichever department comes first alphabetically,
 * so the result is at least stable and reproducible rather than
 * order-dependent.
 */
export function inferSchemeDepartments(txs: TransactionRecord[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()   // gateway -> department -> count
  for (const t of txs) {
    if (!t.gateway || !t.product) continue
    if (!counts.has(t.gateway)) counts.set(t.gateway, new Map())
    const byDept = counts.get(t.gateway)!
    byDept.set(t.product, (byDept.get(t.product) ?? 0) + 1)
  }
  const result = new Map<string, string>()
  for (const [gateway, byDept] of counts) {
    const winner = [...byDept.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    result.set(gateway, winner[0])
  }
  return result
}

/** Combines inferred + manual scheme→department assignments. Manual always wins when present. */
export function buildEffectiveSchemeMap(txs: TransactionRecord[], manual: SchemeDepartmentMapping[]): Map<string, string> {
  const effective = inferSchemeDepartments(txs)
  for (const m of manual) {
    if (m.gateway && m.department) effective.set(m.gateway, m.department)
  }
  return effective
}

/** Same inference as inferSchemeDepartments, for Sales Rep — whichever rep a scheme's transactions most often went through. */
export function inferSchemeSalesReps(txs: TransactionRecord[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()   // gateway -> salesRep -> count
  for (const t of txs) {
    if (!t.gateway || !t.salesRep) continue
    if (!counts.has(t.gateway)) counts.set(t.gateway, new Map())
    const byRep = counts.get(t.gateway)!
    byRep.set(t.salesRep, (byRep.get(t.salesRep) ?? 0) + 1)
  }
  const result = new Map<string, string>()
  for (const [gateway, byRep] of counts) {
    const winner = [...byRep.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    result.set(gateway, winner[0])
  }
  return result
}

/** Combines inferred + manual scheme→sales rep assignments. Manual always wins when present. */
function buildEffectiveSalesRepMap(txs: TransactionRecord[], manual: SchemeSalesRepMapping[]): Map<string, string> {
  const effective = inferSchemeSalesReps(txs)
  for (const m of manual) {
    if (m.gateway && m.salesRep) effective.set(m.gateway, m.salesRep)
  }
  return effective
}

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
// Exact single-row lookup. Only meaningful for Gateway/SalesRep rows now
// (the only types actually stored going forward — see module comment
// above); kept for any legacy Overall/Product/Region rows that predate
// this model and any one-off lookups that genuinely want a single row
// rather than a sum.
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

interface TargetSums { amtAnnual: number; amtRevised: number; cntAnnual: number; cntRevised: number }

/**
 * Sums Gateway or SalesRep leaf target rows across every (year, month) in
 * `periods`. `region`: undefined/'All' sums every region; a specific value
 * restricts to that region only. `values`: undefined means no restriction
 * on dimensionValue (every scheme/rep counts); an array (even empty)
 * restricts to only those values — an empty array deliberately sums to
 * zero, which is exactly right for "a department with no schemes mapped
 * to it yet".
 */
/** Sortable chronological index for a (year, month) pair — spans year boundaries naturally, so carry-forward works across a new year without special-casing it. */
function monthIndex(year: number, month: string): number {
  return year * 12 + MONTHS.indexOf(month)
}

/**
 * Sums Gateway or SalesRep leaf target rows across every (year, month) in
 * `periods`, using CARRY-FORWARD resolution: a target holds for every
 * subsequent month until a newer row for that same (region, dimensionValue)
 * series replaces it — there's no need to re-enter an unchanged target
 * every month. For each period, this resolves to the most recent row at or
 * before that period within each relevant series, then sums that row's
 * amounts (added once per period it covers — a target that never changes
 * for 12 months legitimately contributes 12× its monthly amount to a
 * year's total, the same way an unchanged $10k/month target sums to
 * $120k/year). If a series' most recent applicable row is Inactive, that
 * inactivity ALSO carries forward — it contributes zero until either a
 * newer active row replaces it or an admin explicitly reactivates it with
 * a new row. A period before a series' very first row contributes zero
 * (nothing has ever been set for it yet at that point in time).
 *
 * `region`: undefined/'All' sums every region; a specific value restricts
 * to that region only. `values`: undefined means no restriction on
 * dimensionValue (every scheme/rep counts); an array (even empty)
 * restricts to only those values — an empty array deliberately sums to
 * zero, which is exactly right for "a department with no schemes mapped
 * to it yet".
 */
function sumLeafTargets(
  targets: TargetRecord[],
  periods: [number, string][],
  leafType: 'Gateway' | 'SalesRep',
  opts: { region?: string; values?: string[] }
): TargetSums {
  const sums: TargetSums = { amtAnnual: 0, amtRevised: 0, cntAnnual: 0, cntRevised: 0 }

  // Group into per-(region, dimensionValue) series — carry-forward is a
  // per-series concept, each one has its own independent timeline.
  const seriesMap = new Map<string, TargetRecord[]>()
  for (const t of targets) {
    if (t.dimensionType !== leafType) continue
    if (opts.region && opts.region !== 'All' && t.region !== opts.region) continue
    if (opts.values && !opts.values.includes(t.dimensionValue)) continue
    const key = `${t.region}||${t.dimensionValue}`
    if (!seriesMap.has(key)) seriesMap.set(key, [])
    seriesMap.get(key)!.push(t)
  }
  for (const series of seriesMap.values()) {
    series.sort((a, b) => monthIndex(a.year, a.month) - monthIndex(b.year, b.month))
  }

  for (const series of seriesMap.values()) {
    for (const [y, m] of periods) {
      const idx = monthIndex(y, m)
      let effective: TargetRecord | null = null
      for (const row of series) {
        if (monthIndex(row.year, row.month) <= idx) effective = row
        else break   // series sorted ascending — nothing further back needed
      }
      if (!effective) continue          // nothing set yet for this series at this point in time
      if (!effective.active) continue   // inactive carries forward too — contributes 0
      sums.amtAnnual  += effective.amountAnnualTarget
      sums.amtRevised += effective.amountRevisedTarget
      sums.cntAnnual  += effective.countAnnualTarget
      sums.cntRevised += effective.countRevisedTarget
    }
  }
  return sums
}

/** Builds one performance row from already-computed target sums + the transactions that belong to it. */
function buildRow(
  displayYear: number | 'All', displayMonth: string,
  dimensionType: DimensionType, dimensionValue: string,
  periodTxs: TransactionRecord[],
  sums: TargetSums,
  thresholds: { exceeding: number; onTrack: number; atRisk: number }
): PerformanceRow {
  const actualAmount = periodTxs.reduce((s, r) => s + r.amountPaid, 0)
  const actualCount  = periodTxs.length

  const { flag, achievementPct: amtAch, variance: amtVar } =
    computePerformanceFlag(actualAmount, sums.amtRevised, thresholds)
  const { achievementPct: amtVsAnnual } =
    computePerformanceFlag(actualAmount, sums.amtAnnual, thresholds)
  const { achievementPct: cntAch, variance: cntVar } =
    computePerformanceFlag(actualCount, sums.cntRevised, thresholds)

  return {
    year: displayYear === 'All' ? 0 : displayYear, month: displayMonth, dimensionType, dimensionValue,
    amountAnnualTarget: sums.amtAnnual, amountRevisedTarget: sums.amtRevised,
    actualAmount, amountVariance: amtVar, amountAchievementPct: amtAch, amountVsAnnualPct: amtVsAnnual,
    countAnnualTarget: sums.cntAnnual, countRevisedTarget: sums.cntRevised,
    actualCount, countVariance: cntVar, countAchievementPct: cntAch,
    active: true, flag,
  }
}

// ── Compute performance for a period ─────────────────────────
// year: 'All' aggregates every year present in the data. month: 'All'
// aggregates every month of the selected year(s). Any combination of the
// two works. Also applies the product/gateway/region/salesRep filters if
// given, so a filter picked on any page actually narrows the numbers
// shown, not just the URL — and, per the target model above, a region
// filter also narrows which Gateway/SalesRep target rows count toward
// Overall/Region/Department.
export function computePerformance(
  txs:       TransactionRecord[],
  targets:   TargetRecord[],
  year:      number | 'All',
  month:     string,
  thresholds: { exceeding: number; onTrack: number; atRisk: number },
  dimFilters?: Pick<PerfFilters, 'product' | 'gateway' | 'region' | 'salesRep'>,
  schemeMap: SchemeDepartmentMapping[] = [],
  salesRepMap: SchemeSalesRepMapping[] = []
): {
  overall:  PerformanceRow
  byProduct: PerformanceRow[]
  byGateway: PerformanceRow[]
  byRegion:  PerformanceRow[]
  bySalesRep:PerformanceRow[]
} {
  const isAllMonths = isOpen(month)
  const isAllYears  = year === 'All'
  const regionFilter = dimFilters?.region

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

  // Computed once, reused by Overall (below) and by the Department/SalesRep
  // roll-ups further down — avoids recomputing the same inference twice.
  const effectiveSchemeMap  = buildEffectiveSchemeMap(txs, schemeMap)
  const effectiveSalesRepMap = buildEffectiveSalesRepMap(txs, salesRepMap)

  // Overall = every Gateway target, across every region (or just the
  // filtered one) — never a directly-entered row. Must also narrow to
  // whichever Gateway/Product/SalesRep filter is active, exactly the same
  // way periodTxs (the actuals side, above) already does — otherwise
  // filtering to one scheme changes "Amount Collected" but leaves "Annual
  // Plan"/"Revised Target" frozen at the company-wide total, which is
  // exactly the bug this fixes. Multiple simultaneous filters intersect
  // rather than override each other.
  let allowedGateways: string[] | undefined
  const intersectWith = (values: string[]) => {
    allowedGateways = allowedGateways === undefined ? values : allowedGateways.filter(v => values.includes(v))
  }
  if (dimFilters?.gateway && dimFilters.gateway !== 'All') {
    intersectWith([dimFilters.gateway])
  }
  if (dimFilters?.product && dimFilters.product !== 'All') {
    intersectWith([...effectiveSchemeMap.entries()].filter(([, dept]) => dept === dimFilters.product).map(([gw]) => gw))
  }
  if (dimFilters?.salesRep && dimFilters.salesRep !== 'All') {
    intersectWith([...effectiveSalesRepMap.entries()].filter(([, rep]) => rep === dimFilters.salesRep).map(([gw]) => gw))
  }

  const overallSums = sumLeafTargets(relevantTargets, periods, 'Gateway', { region: regionFilter, values: allowedGateways })
  const overall = buildRow(year, month, 'Overall', 'Overall', periodTxs, overallSums, thresholds)

  // Region (Hospital) roll-up: each region's own Gateway targets summed.
  function byRegion(): PerformanceRow[] {
    const dimTargets = relevantTargets.filter(t => t.dimensionType === 'Gateway' && t.region)
    const values = new Set<string>([...periodTxs.map(r => r.region), ...dimTargets.map(t => t.region)])
    return [...values].filter(Boolean).map(v => {
      const sums = sumLeafTargets(relevantTargets, periods, 'Gateway', { region: v })
      const rowTxs = periodTxs.filter(r => r.region === v)
      return buildRow(year, month, 'Region', v, rowTxs, sums, thresholds)
    }).sort((a, b) => b.amountAchievementPct - a.amountAchievementPct)
  }

  // Payment Scheme roll-up: each scheme's target summed across whichever
  // region(s) are in scope (all of them, or just the filtered one).
  function byGateway(): PerformanceRow[] {
    const dimTargets = relevantTargets.filter(t =>
      t.dimensionType === 'Gateway' && (!regionFilter || regionFilter === 'All' || t.region === regionFilter))
    const values = new Set<string>([...periodTxs.map(r => r.gateway), ...dimTargets.map(t => t.dimensionValue)])
    return [...values].map(v => {
      const sums = sumLeafTargets(relevantTargets, periods, 'Gateway', { region: regionFilter, values: [v] })
      const rowTxs = periodTxs.filter(r => r.gateway === v)
      return buildRow(year, month, 'Gateway', v, rowTxs, sums, thresholds)
    }).sort((a, b) => b.amountAchievementPct - a.amountAchievementPct)
  }

  // Department roll-up: sum of every scheme mapped to this department
  // (inferred from transaction history, with any manual override applied),
  // across whichever region(s) are in scope. A department with no schemes
  // mapped to it yet correctly sums to zero. Note actuals are still grouped
  // by the transaction's own recorded department — independent of the
  // scheme map, which only drives targets.
  function byProduct(): PerformanceRow[] {
    const values = new Set<string>([...periodTxs.map(r => r.product), ...effectiveSchemeMap.values()])
    return [...values].map(v => {
      const mappedSchemes = [...effectiveSchemeMap.entries()].filter(([, dept]) => dept === v).map(([gw]) => gw)
      const sums = sumLeafTargets(relevantTargets, periods, 'Gateway', { region: regionFilter, values: mappedSchemes })
      const rowTxs = periodTxs.filter(r => r.product === v)
      return buildRow(year, month, 'Product', v, rowTxs, sums, thresholds)
    }).sort((a, b) => b.amountAchievementPct - a.amountAchievementPct)
  }

  // Sales Rep roll-up: sum of every scheme mapped to this rep (inferred
  // from transaction history, with any manual override applied), across
  // whichever region(s) are in scope. A rep with no schemes mapped to
  // them yet correctly sums to zero. Actuals are still grouped by the
  // transaction's own recorded rep — independent of the scheme map, which
  // only drives targets. No longer a manually-entered target dimension —
  // see docs/TARGETS_MODEL.md.
  function bySalesRep(): PerformanceRow[] {
    const values = new Set<string>([...periodTxs.map(r => r.salesRep), ...effectiveSalesRepMap.values()])
    return [...values].map(v => {
      const mappedSchemes = [...effectiveSalesRepMap.entries()].filter(([, rep]) => rep === v).map(([gw]) => gw)
      const sums = sumLeafTargets(relevantTargets, periods, 'Gateway', { region: regionFilter, values: mappedSchemes })
      const rowTxs = periodTxs.filter(r => r.salesRep === v)
      return buildRow(year, month, 'SalesRep', v, rowTxs, sums, thresholds)
    }).sort((a, b) => b.amountAchievementPct - a.amountAchievementPct)
  }

  return { overall, byProduct: byProduct(), byGateway: byGateway(), byRegion: byRegion(), bySalesRep: bySalesRep() }
}

// ── Year-to-date computation ──────────────────────────────────
export function computeYTD(
  txs: TransactionRecord[],
  targets: TargetRecord[],
  year: number,
  upToMonth: string,   // include Jan through this month
  region?: string
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
    const monthTxs   = filterTransactions(txs, { year, month, status: 'Active', region })
    const sums       = sumLeafTargets(targets, [[year, month]], 'Gateway', { region })
    const actual     = monthTxs.reduce((s, r) => s + r.amountPaid, 0)
    const annualTgt  = sums.amtAnnual
    const revisedTgt = sums.amtRevised
    const ach        = revisedTgt > 0 ? (actual / revisedTgt) * 100 : 0
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
