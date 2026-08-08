/**
 * lib/utils.ts — Pure utility functions, safe everywhere (Edge + Node + Client)
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PerformanceFlag, PerformanceThresholds, OrgSettings, TihemsCompanyInfo, TransactionRecord, TargetRecord, OrgMetadata } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency ─────────────────────────────────────────────────
export function formatCurrency(value: number, symbol = '$'): string {
  const abs  = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  return `${sign}${symbol}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCurrencyCompact(value: number, symbol = '$'): string {
  const abs  = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// ── Performance ───────────────────────────────────────────────
export function computePerformanceFlag(
  actual: number, target: number,
  thresholds: PerformanceThresholds = { exceeding: 100, onTrack: 90, atRisk: 75 }
): { flag: PerformanceFlag; achievementPct: number; variance: number } {
  const variance       = actual - target
  const achievementPct = target === 0 ? 0 : (actual / target) * 100
  let flag: PerformanceFlag
  if      (achievementPct >= thresholds.exceeding) flag = 'Exceeding'
  else if (achievementPct >= thresholds.onTrack)   flag = 'On Track'
  else if (achievementPct >= thresholds.atRisk)    flag = 'At Risk'
  else                                              flag = 'Below Target'
  return { flag, achievementPct, variance }
}

export const PERFORMANCE_STYLES: Record<PerformanceFlag, { color: string; bg: string; emoji: string }> = {
  'Exceeding':    { color: 'text-emerald-500', bg: 'bg-emerald-500/10', emoji: '🟢' },
  'On Track':     { color: 'text-blue-500',    bg: 'bg-blue-500/10',    emoji: '🔵' },
  'At Risk':      { color: 'text-amber-500',   bg: 'bg-amber-500/10',   emoji: '🟡' },
  'Below Target': { color: 'text-red-500',     bg: 'bg-red-500/10',     emoji: '🔴' },
}

// ── Date helpers ─────────────────────────────────────────────

/**
 * The list of years to offer in any Year filter, app-wide.
 *
 * Deliberately NOT derived only from existing transactions/targets — a
 * brand-new deployment with no data yet would otherwise have zero years
 * to pick from, disabling the filter entirely. Always includes a sensible
 * window around the current year, merged with any years that genuinely
 * have data (so old records are never excluded either).
 */
export function getAvailableYears(txs: TransactionRecord[], targets: TargetRecord[]): number[] {
  const now = new Date().getFullYear()
  const baseline = [now - 2, now - 1, now, now + 1]
  const fromData = [...txs.map(t => t.year), ...targets.map(t => t.year)]
  return [...new Set([...baseline, ...fromData])].sort((a, b) => b - a)
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

/** Month options for a filter dropdown that also allows "every month". */
export const MONTHS_WITH_ALL = ['All', ...MONTHS]

/**
 * Distinct Product/Gateway/Region/SalesRep values actually present in the
 * ledger, sorted alphabetically. Used to populate filter dropdowns (Overview,
 * Analysis, Reports) so a value only shows up once it's genuinely been used
 * in a transaction — independent of what's registered in Settings > Data
 * Lists (which remains the controlled vocabulary for the Entry form and
 * Targets, where you're choosing a value to write, not filtering by one).
 */
export function getDimensionOptions(txs: TransactionRecord[]): {
  products: string[]; gateways: string[]; regions: string[]; salesReps: string[]
} {
  const uniqSorted = (values: (string | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
  return {
    products:  uniqSorted(txs.map(t => t.product)),
    gateways:  uniqSorted(txs.map(t => t.gateway)),
    regions:   uniqSorted(txs.map(t => t.region)),
    salesReps: uniqSorted(txs.map(t => t.salesRep)),
  }
}

/**
 * Union of the Data Lists registry (Settings > Data Lists — the only way to
 * pre-register a brand-new value before it's ever been used) and whatever
 * values are already present in the ledger. Used everywhere a dimension
 * needs to be *selected* while writing data — Entry, Targets, and the
 * Transaction Ledger's edit modal — so a value is available the moment
 * either (a) an admin registers it, or (b) it's actually been used in a
 * real transaction, whichever happens first. Data Lists is never bypassed
 * entirely: it remains the only way to add a value that doesn't exist yet
 * anywhere.
 *
 * Overview's filter dropdowns intentionally do NOT use this — they use
 * getDimensionOptions() directly (ledger-only), since a filter should only
 * ever offer values that actually appear in the data being filtered.
 */
export function mergeDimensionOptions(metadata: OrgMetadata, txs: TransactionRecord[]): OrgMetadata {
  const fromLedger = getDimensionOptions(txs)
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])].sort((x, y) => x.localeCompare(y))
  return {
    ...metadata,
    products:  union(metadata.products,  fromLedger.products),
    gateways:  union(metadata.gateways,  fromLedger.gateways),
    regions:   union(metadata.regions,   fromLedger.regions),
    salesReps: union(metadata.salesReps, fromLedger.salesReps),
    customers: union(metadata.customers, [...new Set(txs.map(t => t.customerName).filter(Boolean))]),
  }
}

export function formatDate(iso: string, format: OrgSettings['dateFormat'] = 'DD/MM/YYYY'): string {
  const d   = new Date(iso)
  const day = String(d.getDate()).padStart(2,'0')
  const mon = String(d.getMonth()+1).padStart(2,'0')
  const yr  = d.getFullYear()
  if (format === 'MM/DD/YYYY') return `${mon}/${day}/${yr}`
  if (format === 'YYYY-MM-DD') return `${yr}-${mon}-${day}`
  return `${day}/${mon}/${yr}`
}

// ── ID generator ──────────────────────────────────────────────
export function generateId(prefix = ''): string {
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const rand = Math.random().toString(36).slice(2,6).toUpperCase()
  return `${prefix}${date}-${rand}`
}

// ── Number helpers ────────────────────────────────────────────
export function safeParseNumber(value: unknown): number {
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

// ── Default Tihems platform company info ────────────────────────
export const DEFAULT_TIHEMS_COMPANY: TihemsCompanyInfo = {
  companyName:  'Tihems',
  tagline:      'Performance Intelligence, for any team that tracks a target.',
  email:        '',
  phone:        '',
  address:      '',
  website:      '',
  linkedinUrl:  '',
  twitterUrl:   '',
  facebookUrl:  '',
  instagramUrl: '',
  pages: [
    {
      id: 'about', title: 'About',
      content: 'Tihems is a performance dashboard built to replace spreadsheet-and-slide reporting with a single, live system of record.\n\nEvery dimension in Tihems — what a "Product" is called, what a "Customer" is called — is renamable, which is what lets the same software serve very different kinds of organizations without a single line of code changing.',
    },
    {
      id: 'mission', title: 'Our Mission',
      content: 'To give every organization a clear, honest, always-current answer to one question: how are we doing against target, and why.',
    },
    {
      id: 'contact', title: 'Contact',
      content: 'Get in touch using the details below.',
    },
  ],
}

// ── Default settings ──────────────────────────────────────────
export const DEFAULT_SETTINGS: OrgSettings = {
  orgName:             'Tihems',
  orgLegalName:        '',
  tagline:             'Performance Intelligence',
  logoUrlLight:        '',
  logoUrlDark:         '',
  faviconUrl:          '',
  websiteUrl:          '',
  logoUrlSecondary:      '',
  logoPositionSecondary: 'Right',
  logoUrlTertiary:       '',
  logoPositionTertiary:  'Upper Center',
  primaryEmail:        '',
  supportEmail:        '',
  phoneNumber:         '',
  address:             '',
  postalCode:          '',
  linkedinUrl:         '',
  otherSocialUrl:      '',
  primaryColor:        '#0284c7',
  secondaryColor:      '#7dd3fc',
  sidebarColor:        '#0c3460',
  accentColor:         '#16a34a',
  defaultMode:         'light',
  fontFamily:          'Inter',
  reportTitlePrefix:   'Performance Report —',
  preparedByDefault:   '',
  footerText:          'Confidential. For internal use only.',
  currencySymbol:      '$',
  currencyCode:        'USD',
  currencyFormat:      'comma-dot',
  dateFormat:          'DD/MM/YYYY',
  fiscalYearStart:     'January',
  includeWatermark:    false,
  watermarkText:       'CONFIDENTIAL',
  showRecordedBy:      true,
  productLabel:        'Product',
  gatewayLabel:        'Payment Gateway',
  regionLabel:         'Region',
  salesRepLabel:       'Sales Rep',
  customerLabel:       'Customer',
  perfThresholdExceeding: 100,
  perfThresholdOnTrack:   90,
  perfThresholdAtRisk:    75,
  requireEntryNotes:   false,
}
