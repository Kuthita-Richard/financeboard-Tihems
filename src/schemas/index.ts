import { z } from 'zod'

// ── Transaction Entry ─────────────────────────────────────────
export const transactionSchema = z.object({
  date:         z.string().min(1, 'Date is required').refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
  customerName: z.string().min(1, 'Customer name is required').max(200),
  region:       z.string().min(1, 'Region is required'),
  product:      z.string().min(1, 'Product/Service is required'),
  gateway:      z.string().min(1, 'Payment gateway is required'),
  salesRep:     z.string().min(1, 'Sales rep is required'),
  amountPaid:   z.number({ error: 'Must be a number' }).positive('Amount must be greater than 0'),
  status:       z.enum(['Active', 'Inactive']),
  referenceNumber: z.string().max(50).optional(),
  notes:        z.string().max(500).optional(),
})
export type TransactionFormInput = z.infer<typeof transactionSchema>

// ── Target Entry ─────────────────────────────────────────────
export const targetSchema = z.object({
  year:                z.number().int().min(2000).max(2100),
  month:               z.string().min(1, 'Month is required'),
  dimensionType:       z.enum(['Overall', 'Product', 'Gateway', 'Region', 'SalesRep']),
  dimensionValue:      z.string().min(1, 'Dimension value is required'),
  amountAnnualTarget:  z.number().min(0, 'Cannot be negative'),
  amountRevisedTarget: z.number().min(0, 'Cannot be negative'),
  countAnnualTarget:   z.number().int().min(0, 'Cannot be negative'),
  countRevisedTarget:  z.number().int().min(0, 'Cannot be negative'),
  active:              z.boolean(),
  notes:               z.string().max(300).optional(),
})
export type TargetFormInput = z.infer<typeof targetSchema>

// ── Excel upload ──────────────────────────────────────────────
export const excelTransactionSchema = z.object({
  date:         z.string().min(1),
  customerName: z.string().min(1, 'Customer name required'),
  region:       z.string().min(1, 'Region required'),
  product:      z.string().min(1, 'Product required'),
  gateway:      z.string().min(1, 'Gateway required'),
  salesRep:     z.string().min(1, 'Sales rep required'),
  amountPaid:   z.number().positive('Amount must be > 0'),
  status:       z.enum(['Active', 'Inactive']).default('Active'),
  referenceNumber: z.string().optional(),
  notes:        z.string().optional(),
})

// ── Tihems platform company info (not client org settings) ─────
export const tihemsCompanyPageSchema = z.object({
  id:      z.string(),
  title:   z.string().min(1, 'Title required').max(60),
  content: z.string().max(5000).optional().default(''),
})
export const tihemsCompanySchema = z.object({
  companyName:  z.string().min(1).max(100),
  tagline:      z.string().max(200).optional(),
  email:        z.string().email().optional().or(z.literal('')),
  phone:        z.string().max(30).optional(),
  address:      z.string().max(300).optional(),
  website:      z.string().url().optional().or(z.literal('')),
  linkedinUrl:  z.string().url().optional().or(z.literal('')),
  twitterUrl:   z.string().url().optional().or(z.literal('')),
  facebookUrl:  z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  pages:        z.array(tihemsCompanyPageSchema).max(20, 'Maximum 20 pages'),
})

// ── Settings schemas ──────────────────────────────────────────
export const identitySettingsSchema = z.object({
  orgName:      z.string().min(1).max(100),
  orgLegalName: z.string().max(150).optional(),
  tagline:      z.string().max(200).optional(),
  websiteUrl:   z.string().url().optional().or(z.literal('')),
  logoUrlLight: z.string().optional(),
  logoUrlDark:  z.string().optional(),
  faviconUrl:   z.string().optional(),
  logoUrlSecondary:      z.string().optional(),
  logoPositionSecondary: z.enum(['Left', 'Right', 'Upper Center']).optional(),
  logoUrlTertiary:       z.string().optional(),
  logoPositionTertiary:  z.enum(['Left', 'Right', 'Upper Center']).optional(),
})

export const contactSettingsSchema = z.object({
  primaryEmail:   z.string().email().optional().or(z.literal('')),
  supportEmail:   z.string().email().optional().or(z.literal('')),
  phoneNumber:    z.string().max(30).optional(),
  address:        z.string().max(300).optional(),
  postalCode:     z.string().max(20).optional(),
  linkedinUrl:    z.string().url().optional().or(z.literal('')),
  otherSocialUrl: z.string().url().optional().or(z.literal('')),
})

export const brandingSettingsSchema = z.object({
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour'),
  sidebarColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour'),
  accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour'),
  defaultMode:    z.enum(['light', 'dark', 'system']),
  fontFamily:     z.enum(['Inter', 'Poppins', 'DM Sans', 'Plus Jakarta Sans', 'Geist']),
})

export const reportSettingsSchema = z.object({
  reportTitlePrefix: z.string().max(100).optional(),
  preparedByDefault: z.string().max(100).optional(),
  footerText:        z.string().max(300).optional(),
  currencySymbol:    z.string().max(5),
  currencyCode:      z.string().length(3),
  currencyFormat:    z.enum(['comma-dot', 'dot-comma']),
  dateFormat:        z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  fiscalYearStart:   z.string(),
  includeWatermark:  z.boolean(),
  watermarkText:     z.string().max(50).optional(),
  showRecordedBy:    z.boolean(),
})

export const appConfigSchema = z.object({
  productLabel:           z.string().min(1).max(50),
  gatewayLabel:           z.string().min(1).max(50),
  regionLabel:            z.string().min(1).max(50),
  salesRepLabel:          z.string().min(1).max(50),
  customerLabel:          z.string().min(1).max(50),
  perfThresholdExceeding: z.number().min(0).max(200),
  perfThresholdOnTrack:   z.number().min(0).max(200),
  perfThresholdAtRisk:    z.number().min(0).max(200),
  requireEntryNotes:      z.boolean(),
})

export const authorizedUserSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['Admin', 'DataEntry', 'Viewer']),
})
