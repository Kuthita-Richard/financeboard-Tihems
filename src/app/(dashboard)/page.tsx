import { getTransactions, getTargets, getOrgSettings, getSchemeDepartmentMap, getSchemeSalesRepMap } from '@/lib/sheets'
import { getExchangeRates, getCurrencySymbol } from '@/lib/currency'
import { computePerformance, filterTransactions } from '@/lib/performance'
import { MONTHS, getAvailableYears } from '@/lib/utils'
import type { DashboardFilters, TransactionRecord } from '@/types'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const filters: DashboardFilters = {
    year:     sp.year     || new Date().getFullYear().toString(),
    month:    sp.month    || MONTHS[new Date().getMonth()],
    product:  sp.product  || 'All',
    gateway:  sp.gateway  || 'All',
    region:   sp.region   || 'All',
    salesRep: sp.salesRep || 'All',
    status:   sp.status   || 'All',
  }

  const displayCurrency = sp.currency || null
  const [settings, txs, targets, schemeMap, salesRepMap] = await Promise.all([
    getOrgSettings(), getTransactions(), getTargets(), getSchemeDepartmentMap(), getSchemeSalesRepMap(),
  ])

  const baseCurrency    = settings.currencyCode || 'USD'
  const targetCurrency  = displayCurrency || baseCurrency
  const needsConversion = targetCurrency !== baseCurrency

  const exchangeRates = needsConversion ? await getExchangeRates(baseCurrency) : null
  const rate          = exchangeRates?.rates[targetCurrency] ?? 1

  const year: number | 'All' = filters.year === 'All' ? 'All' : (parseInt(filters.year) || new Date().getFullYear())
  const month = filters.month || MONTHS[new Date().getMonth()]

  // Cascading filter options: each dropdown only offers values that
  // actually exist given Year/Month plus whichever OTHER dimension filters
  // are currently active — e.g. once Department is filtered to Maternity,
  // Payment Scheme should only list schemes that actually appear under
  // Maternity, not every scheme in the company. Previously all four
  // dropdowns pulled from the same flat, ledger-wide list regardless of
  // what else was selected, so picking one only from the flat list could
  // easily land on a combination guaranteed to show zero data.
  // The currently-selected value for a dimension is always kept in its own
  // dropdown even if it would otherwise disappear under the other active
  // filters — so a selection never mysteriously vanishes out from under you.
  const distinctValues = (rows: TransactionRecord[], field: 'product' | 'gateway' | 'region' | 'salesRep'): string[] =>
    [...new Set(rows.map(t => t[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const scopeExcluding = (exclude: 'product' | 'gateway' | 'region' | 'salesRep') =>
    filterTransactions(txs, {
      year, month, status: 'Active',
      product:  exclude === 'product'  ? undefined : filters.product,
      gateway:  exclude === 'gateway'  ? undefined : filters.gateway,
      region:   exclude === 'region'   ? undefined : filters.region,
      salesRep: exclude === 'salesRep' ? undefined : filters.salesRep,
    })

  const withSelected = (values: string[], selected: string): string[] =>
    selected !== 'All' && !values.includes(selected) ? [...values, selected].sort((a, b) => a.localeCompare(b)) : values

  const metadata = {
    products:  withSelected(distinctValues(scopeExcluding('product'),  'product'),  filters.product),
    gateways:  withSelected(distinctValues(scopeExcluding('gateway'),  'gateway'),  filters.gateway),
    regions:   withSelected(distinctValues(scopeExcluding('region'),   'region'),   filters.region),
    salesReps: withSelected(distinctValues(scopeExcluding('salesRep'), 'salesRep'), filters.salesRep),
    customers: [], statuses: ['Active', 'Inactive'],
  }

  // Dimension filters (Product/Gateway/Region/SalesRep) are now actually
  // applied to the computed numbers below, not just reflected in the URL —
  // previously selecting one changed the address bar but not a single KPI,
  // chart, or table on the page.
  const perf = computePerformance(txs, targets, year, month, {
    exceeding: settings.perfThresholdExceeding,
    onTrack:   settings.perfThresholdOnTrack,
    atRisk:    settings.perfThresholdAtRisk,
  }, {
    product:  filters.product,
    gateway:  filters.gateway,
    region:   filters.region,
    salesRep: filters.salesRep,
  }, schemeMap, salesRepMap)

  // Apply currency conversion
  const convert = needsConversion
    ? <T extends { actualAmount: number; amountAnnualTarget: number; amountRevisedTarget: number; amountVariance: number }>(row: T): T => ({
        ...row,
        actualAmount:         row.actualAmount         * rate,
        amountAnnualTarget:   row.amountAnnualTarget   * rate,
        amountRevisedTarget:  row.amountRevisedTarget  * rate,
        amountVariance:       row.amountVariance       * rate,
      })
    : <T,>(row: T): T => row

  const perfConverted = {
    overall:   convert(perf.overall),
    byProduct: perf.byProduct.map(convert),
    byGateway: perf.byGateway.map(convert),
    byRegion:  perf.byRegion.map(convert),
    bySalesRep:perf.bySalesRep.map(convert),
  }

  const years = getAvailableYears(txs, targets).map(String)
  const displaySymbol = needsConversion ? getCurrencySymbol(targetCurrency) : settings.currencySymbol

  return (
    <DashboardClient
      perf={perfConverted} filters={filters} settings={settings} metadata={metadata}
      years={years} displayCurrency={targetCurrency} baseCurrency={baseCurrency}
      displaySymbol={displaySymbol} exchangeRateUpdatedAt={exchangeRates?.updatedAt ?? null}
    />
  )
}
