// ── Auth ─────────────────────────────────────────────────────
export type UserRole = 'Admin' | 'DataEntry' | 'Viewer'

export interface AppUser {
  id: string; name: string; email: string
  image?: string; role: UserRole; provider: 'google' | 'credentials'
}

export interface AuthorizedUser {
  email: string; role: UserRole; addedAt: string; addedBy: string
}

// ── Performance ───────────────────────────────────────────────
export type PerformanceFlag = 'Exceeding' | 'On Track' | 'At Risk' | 'Below Target'
export interface PerformanceThresholds { exceeding: number; onTrack: number; atRisk: number }

// ── TRANSACTION RECORD ────────────────────────────────────────
// The raw daily ledger. One row per customer transaction.
// NO target fields here. Pure fact record.
export interface TransactionRecord {
  id:             string
  rowIndex:       number    // physical spreadsheet row — needed for edit/delete
  date:           string    // ISO YYYY-MM-DD
  year:           number
  month:          string    // January … December
  customerName:   string    // the person/entity who paid
  region:         string    // entered per transaction, not derived from rep
  product:        string    // product or service received
  gateway:        string    // payment method used
  salesRep:       string    // who served this customer
  amountPaid:     number    // actual amount received
  status:         'Active' | 'Inactive'
  referenceNumber:string    // receipt no. / LPO no. / M-Pesa code — whatever proves the transaction
  notes:          string
  recordedBy:     string
  recordedByEmail:string
  recordedAt:     string
}

export interface TransactionInput {
  date:        string
  customerName:string
  region:      string
  product:     string
  gateway:     string
  salesRep:    string
  amountPaid:  number
  status:      'Active' | 'Inactive'
  referenceNumber?: string
  notes?:      string
}

// ── TARGET RECORD ─────────────────────────────────────────────
// Set by admin per dimension per month.
// Every month must have an explicit row — no implicit fallbacks.
// If a dimension is Inactive for a month → amount and count both zero.
export type DimensionType = 'Overall' | 'Product' | 'Gateway' | 'Region' | 'SalesRep'

export interface TargetRecord {
  id:                    string
  rowIndex:              number    // physical spreadsheet row — needed for edit/delete
  year:                  number
  month:                 string    // January … December (explicit, always set)
  dimensionType:         DimensionType
  dimensionValue:        string    // e.g. 'Product A', 'M-Pesa', 'North', 'Alice Johnson', 'Overall'
  amountAnnualTarget:    number    // monthly plan set at year start
  amountRevisedTarget:   number    // adjusted for this specific month
  countAnnualTarget:     number    // customer count plan at year start
  countRevisedTarget:    number    // adjusted count for this month
  active:                boolean   // false = excluded from calculations this month
  setBy:                 string
  setAt:                 string
  notes:                 string
}

export interface TargetInput {
  year:                  number
  month:                 string
  dimensionType:         DimensionType
  dimensionValue:        string
  amountAnnualTarget:    number
  amountRevisedTarget:   number
  countAnnualTarget:     number
  countRevisedTarget:    number
  active:                boolean
  notes?:                string
}

// ── PERFORMANCE ROW ───────────────────────────────────────────
// Computed at report time by joining TransactionRecords against TargetRecords.
// Never stored — always derived.
export interface PerformanceRow {
  year:                  number
  month:                 string
  dimensionType:         DimensionType
  dimensionValue:        string
  amountAnnualTarget:    number
  amountRevisedTarget:   number
  actualAmount:          number
  amountVariance:        number    // actual - revisedTarget
  amountAchievementPct:  number    // (actual / revisedTarget) * 100
  amountVsAnnualPct:     number    // (actual / annualTarget) * 100
  countAnnualTarget:     number
  countRevisedTarget:    number
  actualCount:           number    // number of transactions
  countVariance:         number
  countAchievementPct:   number
  active:                boolean
  flag:                  PerformanceFlag
}

// ── METADATA ──────────────────────────────────────────────────
export interface OrgMetadata {
  products:   string[]   // dynamic label
  gateways:   string[]   // dynamic label
  regions:    string[]
  salesReps:  string[]
  customers:  string[]   // for autocomplete only, not targets
  statuses:   string[]
}

// ── ORG SETTINGS ─────────────────────────────────────────────
// ── TIHEMS PLATFORM COMPANY INFO ────────────────────────────────
// Distinct from OrgSettings above: this describes Tihems itself (the
// software vendor), never the client organization using this instance.
export interface TihemsCompanyPage {
  id:      string
  title:   string
  content: string   // plain text, paragraphs separated by blank lines
}

export interface TihemsCompanyInfo {
  companyName:  string
  tagline:      string
  email:        string
  phone:        string
  address:      string
  website:      string
  linkedinUrl:  string
  twitterUrl:   string
  facebookUrl:  string
  instagramUrl: string
  pages:        TihemsCompanyPage[]
}

export interface OrgSettings {
  // Identity
  orgName:             string
  orgLegalName:        string
  tagline:             string
  logoUrlLight:        string
  logoUrlDark:         string
  faviconUrl:          string
  websiteUrl:          string
  // Additional logos (co-branding, partner marks) — shown in report headers
  logoUrlSecondary:      string
  logoPositionSecondary: 'Left' | 'Right' | 'Upper Center'
  logoUrlTertiary:       string
  logoPositionTertiary:  'Left' | 'Right' | 'Upper Center'
  // Contact
  primaryEmail:        string
  supportEmail:        string
  phoneNumber:         string
  address:             string
  postalCode:          string
  linkedinUrl:         string
  otherSocialUrl:      string
  // Branding
  primaryColor:        string
  secondaryColor:      string
  sidebarColor:        string
  accentColor:         string
  defaultMode:         'light' | 'dark' | 'system'
  fontFamily:          string
  // Reports
  reportTitlePrefix:   string
  preparedByDefault:   string
  footerText:          string
  currencySymbol:      string
  currencyCode:        string
  currencyFormat:      'comma-dot' | 'dot-comma'
  dateFormat:          'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  fiscalYearStart:     string
  includeWatermark:    boolean
  watermarkText:       string
  showRecordedBy:      boolean
  // Dynamic labels (all renamable)
  productLabel:        string   // Product / Service / Item / Department
  gatewayLabel:        string   // Payment Gateway / Channel / Method
  regionLabel:         string   // Region / Branch / Territory / Zone
  salesRepLabel:       string   // Sales Rep / Officer / Agent / Executive
  customerLabel:       string   // Customer / Patient / Client / Member
  // Performance thresholds
  perfThresholdExceeding: number
  perfThresholdOnTrack:   number
  perfThresholdAtRisk:    number
  // App config
  requireEntryNotes:   boolean
}

// ── DASHBOARD ─────────────────────────────────────────────────
export interface DashboardKPIs {
  totalAmount:           number   // sum of amountPaid
  totalCount:            number   // total transactions
  uniqueCustomers:       number
  amountAnnualTarget:    number
  amountRevisedTarget:   number
  amountAchievementPct:  number   // vs revised
  amountVsAnnualPct:     number   // vs annual
  countAnnualTarget:     number
  countRevisedTarget:    number
  countAchievementPct:   number
  amountVariance:        number
  countVariance:         number
  flag:                  PerformanceFlag
}

export interface DashboardFilters {
  year:    string
  month:   string
  product: string
  gateway: string
  region:  string
  salesRep:string
  status:  string
}

// ── UPLOAD ────────────────────────────────────────────────────
export interface UploadResult {
  success: number; failed: number; errors: string[]
}
