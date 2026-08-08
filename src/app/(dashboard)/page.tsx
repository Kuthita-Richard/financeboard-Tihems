import { getTransactions, getTargets, getOrgSettings } from '@/lib/sheets'
import { getExchangeRates, getCurrencySymbol } from '@/lib/currency'
import { computePerformance } from '@/lib/performance'
import { MONTHS, getAvailableYears, getDimensionOptions } from '@/lib/utils'
import type { DashboardFilters } from '@/types'
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
  const [settings, txs, targets] = await Promise.all([
    getOrgSettings(), getTransactions(), getTargets(),
  ])

  // Filter dropdown options (Product/Gateway/Region/SalesRep) are derived
  // straight from the ledger — a value only appears once it's actually been
  // used in a real transaction — rather than from the separate Data Lists
  // registry (which remains the controlled vocabulary for the Entry form
  // and Targets, where you're choosing a value to write, not filtering).
  const dimOptions = getDimensionOptions(txs)
  const metadata = {
    products: dimOptions.products, gateways: dimOptions.gateways,
    regions: dimOptions.regions, salesReps: dimOptions.salesReps,
    customers: [], statuses: ['Active', 'Inactive'],
  }

  const baseCurrency    = settings.currencyCode || 'USD'
  const targetCurrency  = displayCurrency || baseCurrency
  const needsConversion = targetCurrency !== baseCurrency

  const exchangeRates = needsConversion ? await getExchangeRates(baseCurrency) : null
  const rate          = exchangeRates?.rates[targetCurrency] ?? 1

  const year: number | 'All' = filters.year === 'All' ? 'All' : (parseInt(filters.year) || new Date().getFullYear())
  const month = filters.month || MONTHS[new Date().getMonth()]

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
  })

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
