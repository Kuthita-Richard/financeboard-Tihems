'use server'

import { auth }          from '@/lib/auth'
import {
  createTransaction, bulkCreateTransactions, updateTransaction, deleteTransaction,
  createTarget, updateTarget, deleteTarget,
  updateOrgSettings, getTransactions, getTargets, getOrgSettings,
  updateTihemsCompanyInfo,
  logAuditEvent, upsertAuthorizedUser, addMetadataItem, editMetadataItem, deleteMetadataItem,
} from '@/lib/sheets'
import { generateInsights } from '@/lib/gemini'
import { computePerformance } from '@/lib/performance'
import { MONTHS } from '@/lib/utils'
import { transactionSchema, targetSchema, authorizedUserSchema, excelTransactionSchema, tihemsCompanySchema } from '@/schemas'
import { revalidatePath, updateTag } from 'next/cache'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { safeParseNumber } from '@/lib/utils'
import * as XLSX from 'xlsx'
import type { UserRole, TransactionInput, TargetInput } from '@/types'
import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────
function extractError(e: unknown): string {
  if (!(e instanceof Error)) return 'An unexpected error occurred'
  if (!e.message?.trim())    return 'An unexpected error occurred'
  if (e.message.includes('credentials not configured') || e.message.includes('GOOGLE_SPREADSHEET_ID'))
    return 'Google Sheets is not connected. Check your .env.local credentials.'
  if (e.message.includes('ENOTFOUND') || e.message.includes('fetch failed'))
    return 'Cannot reach Google Sheets. Check your internet connection.'
  if (e.message.includes('PERMISSION_DENIED'))
    return 'Google Sheets permission denied. Share the spreadsheet with your service account email.'
  return e.message
}

async function requireAuth(minRole?: UserRole) {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')
  if (minRole) {
    const h: Record<UserRole, number> = { Viewer: 0, DataEntry: 1, Admin: 2 }
    if (h[session.user.role] < h[minRole]) throw new Error(`Requires ${minRole} role or higher`)
  }
  return session.user
}

// ─────────────────────────────────────────────────────────────
// TRANSACTION ACTIONS
// ─────────────────────────────────────────────────────────────

export async function createTransactionAction(
  data: unknown
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const user   = await requireAuth('DataEntry')
    const parsed = transactionSchema.parse(data)
    const input: TransactionInput = {
      date: parsed.date, customerName: parsed.customerName,
      region: parsed.region, product: parsed.product,
      gateway: parsed.gateway, salesRep: parsed.salesRep,
      amountPaid: parsed.amountPaid, status: parsed.status,
      referenceNumber: parsed.referenceNumber, notes: parsed.notes,
    }
    const record = await createTransaction(input, { name: user.name, email: user.email })
    await logAuditEvent('CREATE_TX', record.id, user.email, user.name,
      `${record.customerName} | ${record.product} | ${record.gateway} | ${record.amountPaid}`)
    updateTag('transactions')
    revalidatePath('/', 'page')
    revalidatePath('/reports/transactions', 'page')
    return { success: true, message: `Transaction saved · ID: ${record.id}`, id: record.id }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, message: e.issues.map(i => i.message).join(', ') }
    return { success: false, message: extractError(e) }
  }
}

// Editing/deleting a transaction after the fact is deliberately Admin-only —
// Data Entry can add records, but changing history is a higher-trust action.
export async function updateTransactionAction(
  rowIndex: number,
  preserved: { recordedBy: string; recordedByEmail: string; recordedAt: string },
  data: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    const user   = await requireAuth('Admin')
    const parsed = transactionSchema.parse(data)
    const input: TransactionInput = {
      date: parsed.date, customerName: parsed.customerName,
      region: parsed.region, product: parsed.product,
      gateway: parsed.gateway, salesRep: parsed.salesRep,
      amountPaid: parsed.amountPaid, status: parsed.status,
      referenceNumber: parsed.referenceNumber, notes: parsed.notes,
    }
    await updateTransaction(rowIndex, input, preserved)
    await logAuditEvent('UPDATE_TX', String(rowIndex), user.email, user.name,
      `Updated ${parsed.customerName} | ${parsed.product} | ${parsed.amountPaid}`)
    updateTag('transactions')
    revalidatePath('/', 'page')
    revalidatePath('/reports/transactions', 'page')
    return { success: true, message: 'Transaction updated' }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, message: e.issues.map(i => i.message).join(', ') }
    return { success: false, message: extractError(e) }
  }
}

export async function deleteTransactionAction(
  rowIndex: number, label: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireAuth('Admin')
    await deleteTransaction(rowIndex)
    await logAuditEvent('DELETE_TX', String(rowIndex), user.email, user.name, `Deleted ${label}`)
    updateTag('transactions')
    revalidatePath('/', 'page')
    revalidatePath('/reports/transactions', 'page')
    return { success: true, message: 'Transaction deleted' }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

export async function importTransactionsAction(
  formData: FormData
): Promise<{ success: number; failed: number; errors: string[]; message: string }> {
  try {
    const user = await requireAuth('DataEntry')
    const file = formData.get('file') as File | null
    if (!file) return { success: 0, failed: 0, errors: [], message: 'No file provided' }

    const buffer   = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

    // Don't blindly trust the first sheet — exports from Excel/Sheets often
    // have a summary or instructions tab before the real data. Use the first
    // sheet that actually contains rows.
    let rawRows: Record<string, unknown>[] = []
    let usedSheetName = ''
    for (const name of workbook.SheetNames) {
      const candidate = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: '' })
      if (candidate.length > 0) { rawRows = candidate; usedSheetName = name; break }
    }

    if (rawRows.length === 0) {
      return {
        success: 0, failed: 0, errors: [],
        message: workbook.SheetNames.length > 1
          ? `No data rows found on any of the ${workbook.SheetNames.length} sheets in this file (checked: ${workbook.SheetNames.join(', ')}). Make sure your data has a header row and at least one data row.`
          : 'No data rows found in this file. Make sure the first row has column headers and there is at least one data row below it.',
      }
    }

    const inputs: TransactionInput[] = []
    const errors: string[]           = []

    rawRows.forEach((row, i) => {
      try {
        const norm = (k: string) => k.toLowerCase().replace(/[\s_-]/g, '')
        const get  = (aliases: string[]): unknown => {
          for (const [k, v] of Object.entries(row))
            if (aliases.includes(norm(k))) return v
          return ''
        }
        const dateRaw = get(['date'])
        const dateStr = dateRaw instanceof Date
          ? dateRaw.toISOString().slice(0,10)
          : String(dateRaw)

        const statusRaw = String(get(['status']) || '').trim().toLowerCase()
        const status: 'Active' | 'Inactive' =
          statusRaw === '' || statusRaw === 'active'   ? 'Active'
          : statusRaw === 'inactive'                   ? 'Inactive'
          : (() => { throw new Error(`Status "${get(['status'])}" is not "Active" or "Inactive"`) })()

        const parsed = excelTransactionSchema.parse({
          date:         dateStr,
          customerName: String(get(['customername','customer','name','patientname','client','member'])),
          region:       String(get(['region','branch','territory','zone'])),
          product:      String(get(['product','service','item','category','department'])),
          gateway:      String(get(['gateway','paymentgateway','paymentmethod','method','channel','payment'])),
          salesRep:     String(get(['salesrep','rep','officer','agent','staff','executive'])),
          amountPaid:   safeParseNumber(get(['amountpaid','amount','paid','amountreceived','total'])),
          status,
          referenceNumber: String(get(['referencenumber','reference','refno','receiptno','receipt','lpo','lpono','mpesacode','mpesareference','transactioncode']) || ''),
          notes:        String(get(['notes','remarks','comments']) || ''),
        })
        inputs.push({ ...parsed })
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Invalid data'}`)
      }
    })

    const result = await bulkCreateTransactions(inputs, { name: user.name, email: user.email })
    await logAuditEvent('IMPORT_TX', 'BULK', user.email, user.name,
      `Imported ${result.success} transactions from ${file.name}`)
    updateTag('transactions')
    revalidatePath('/', 'page')
    revalidatePath('/reports/transactions', 'page')
    return {
      ...result,
      errors: [...errors, ...result.errors],
      message: workbook.SheetNames.length > 1
        ? `Imported ${result.success} records from sheet "${usedSheetName}". ${result.failed + errors.length} failed.`
        : `Imported ${result.success} records. ${result.failed + errors.length} failed.`,
    }
  } catch (e) {
    return { success: 0, failed: 0, errors: [], message: extractError(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// TARGET ACTIONS
// ─────────────────────────────────────────────────────────────

export async function createTargetAction(
  data: unknown
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const user   = await requireAuth('Admin')
    const parsed = targetSchema.parse(data)
    const input: TargetInput = {
      year: parsed.year, month: parsed.month,
      dimensionType: parsed.dimensionType, dimensionValue: parsed.dimensionValue,
      amountAnnualTarget: parsed.amountAnnualTarget,
      amountRevisedTarget: parsed.amountRevisedTarget,
      countAnnualTarget: parsed.countAnnualTarget,
      countRevisedTarget: parsed.countRevisedTarget,
      active: parsed.active, notes: parsed.notes,
    }
    const record = await createTarget(input, { name: user.name, email: user.email })
    await logAuditEvent('CREATE_TARGET', record.id, user.email, user.name,
      `${record.dimensionType}:${record.dimensionValue} ${record.month} ${record.year}`)
    updateTag('targets')
    revalidatePath('/targets', 'page')
    revalidatePath('/', 'page')
    return { success: true, message: 'Target saved successfully', id: record.id }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, message: e.issues.map(i => i.message).join(', ') }
    return { success: false, message: extractError(e) }
  }
}

export async function updateTargetAction(
  rowIndex: number, data: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    const user   = await requireAuth('Admin')
    const parsed = targetSchema.parse(data)
    await updateTarget(rowIndex, parsed as TargetInput, { name: user.name, email: user.email })
    await logAuditEvent('UPDATE_TARGET', String(rowIndex), user.email, user.name,
      `Updated ${parsed.dimensionType}:${parsed.dimensionValue} ${parsed.month} ${parsed.year}`)
    updateTag('targets')
    revalidatePath('/targets', 'page')
    revalidatePath('/', 'page')
    return { success: true, message: 'Target updated successfully' }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, message: e.issues.map(i => i.message).join(', ') }
    return { success: false, message: extractError(e) }
  }
}

export async function deleteTargetAction(
  rowIndex: number, label: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireAuth('Admin')
    await deleteTarget(rowIndex)
    await logAuditEvent('DELETE_TARGET', String(rowIndex), user.email, user.name, `Deleted ${label}`)
    updateTag('targets')
    revalidatePath('/targets', 'page')
    revalidatePath('/', 'page')
    return { success: true, message: 'Target deleted' }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// SETTINGS ACTIONS
// ─────────────────────────────────────────────────────────────

export async function updateSettingsAction(
  updates: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    await updateOrgSettings(updates as Parameters<typeof updateOrgSettings>[0])
    updateTag('org-settings')
    revalidatePath('/', 'layout')
    return { success: true, message: 'Settings saved successfully' }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

export async function uploadLogoAction(
  formData: FormData,
  field: 'logoUrlLight' | 'logoUrlDark' | 'faviconUrl' | 'logoUrlSecondary' | 'logoUrlTertiary'
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    await requireAuth('Admin')
    const file = formData.get('file') as File | null
    if (!file) return { success: false, message: 'No file uploaded' }
    if (!['image/png','image/jpeg','image/svg+xml','image/webp','image/x-icon'].includes(file.type))
      return { success: false, message: 'File must be PNG, JPG, SVG, WEBP or ICO' }
    if (file.size > 2 * 1024 * 1024)
      return { success: false, message: 'File must be under 2MB' }
    const result = await uploadToCloudinary(file, `branding/${field}-${Date.now()}`)
    await updateOrgSettings({ [field]: result.url })
    updateTag('org-settings')
    revalidatePath('/', 'layout')
    return { success: true, url: result.url, message: 'Image uploaded successfully' }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// DATA LISTS ACTIONS
// ─────────────────────────────────────────────────────────────

export async function addMetadataItemAction(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  value: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    const trimmed = value.trim()
    if (!trimmed)         return { success: false, message: 'Value cannot be empty' }
    if (trimmed.length > 100) return { success: false, message: 'Value too long (max 100 chars)' }
    await addMetadataItem(column, trimmed)
    updateTag('metadata')
    revalidatePath('/entry', 'page')
    revalidatePath('/upload', 'page')
    revalidatePath('/targets', 'page')
    revalidatePath('/settings/data-lists', 'page')
    return { success: true, message: `"${trimmed}" added` }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

export async function editMetadataItemAction(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  oldValue: string,
  newValue: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    const trimmed = newValue.trim()
    if (!trimmed)             return { success: false, message: 'Value cannot be empty' }
    if (trimmed.length > 100) return { success: false, message: 'Value too long (max 100 chars)' }
    if (trimmed === oldValue) return { success: true, message: 'No change' }
    await editMetadataItem(column, oldValue, trimmed)
    updateTag('metadata')
    revalidatePath('/entry', 'page')
    revalidatePath('/upload', 'page')
    revalidatePath('/targets', 'page')
    revalidatePath('/reports/transactions', 'page')
    revalidatePath('/settings/data-lists', 'page')
    return { success: true, message: `Renamed to "${trimmed}"` }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

export async function deleteMetadataItemAction(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  value: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    await deleteMetadataItem(column, value)
    updateTag('metadata')
    revalidatePath('/entry', 'page')
    revalidatePath('/upload', 'page')
    revalidatePath('/targets', 'page')
    revalidatePath('/reports/transactions', 'page')
    revalidatePath('/settings/data-lists', 'page')
    return { success: true, message: `"${value}" removed from the list` }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// USER ACTIONS
// ─────────────────────────────────────────────────────────────

export async function upsertUserAction(
  data: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    const currentUser = await requireAuth('Admin')
    const parsed      = authorizedUserSchema.parse(data)
    await upsertAuthorizedUser(
      { email: parsed.email, role: parsed.role as UserRole, addedBy: currentUser.email }
    )
    updateTag('auth-users')
    revalidatePath('/settings/app-config', 'page')
    return { success: true, message: `User ${parsed.email} saved as ${parsed.role}` }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────────────────────
export async function generateInsightsAction(
  year: number, month: string
): Promise<{ success: boolean; text?: string; message: string }> {
  try {
    await requireAuth() // any signed-in role can view insights, same as Analysis/Reports
    const [txs, targets, settings] = await Promise.all([getTransactions(), getTargets(), getOrgSettings()])
    const thresholds = { exceeding: settings.perfThresholdExceeding, onTrack: settings.perfThresholdOnTrack, atRisk: settings.perfThresholdAtRisk }
    const perf = computePerformance(txs, targets, year, month, thresholds)

    const rowLine = (r: typeof perf.overall) =>
      `${r.dimensionValue}: actual ${settings.currencySymbol}${r.actualAmount.toFixed(0)}, ` +
      `annual target ${settings.currencySymbol}${r.amountAnnualTarget.toFixed(0)}, ` +
      `revised target ${settings.currencySymbol}${r.amountRevisedTarget.toFixed(0)}, ` +
      `achievement ${r.amountAchievementPct.toFixed(1)}% vs revised, ${r.amountVsAnnualPct.toFixed(1)}% vs annual, flag: ${r.flag}`

    const summary = [
      `Period: ${month} ${year}`,
      `Overall — ${rowLine(perf.overall)}`,
      `By ${settings.productLabel}:`, ...perf.byProduct.map(r => `  ${rowLine(r)}`),
      `By ${settings.gatewayLabel}:`, ...perf.byGateway.map(r => `  ${rowLine(r)}`),
      `By ${settings.regionLabel}:`, ...perf.byRegion.map(r => `  ${rowLine(r)}`),
      `By ${settings.salesRepLabel}:`, ...perf.bySalesRep.map(r => `  ${rowLine(r)}`),
    ].join('\n')

    const text = await generateInsights(summary, settings.orgName)
    return { success: true, text, message: 'Insights generated' }
  } catch (e) {
    return { success: false, message: extractError(e) }
  }
}

export async function getInsightsContextAction(): Promise<{ years: number[]; months: string[]; defaultYear: number; defaultMonth: string }> {
  const now = new Date()
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)
  return { years, months: [...MONTHS], defaultYear: now.getFullYear(), defaultMonth: MONTHS[now.getMonth()] }
}

// ─────────────────────────────────────────────────────────────
// TIHEMS PLATFORM COMPANY PAGE
// ─────────────────────────────────────────────────────────────
export async function updateTihemsCompanyInfoAction(
  data: unknown
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth('Admin')
    const parsed = tihemsCompanySchema.parse(data)
    await updateTihemsCompanyInfo({
      companyName:  parsed.companyName,
      tagline:      parsed.tagline ?? '',
      email:        parsed.email ?? '',
      phone:        parsed.phone ?? '',
      address:      parsed.address ?? '',
      website:      parsed.website ?? '',
      linkedinUrl:  parsed.linkedinUrl ?? '',
      twitterUrl:   parsed.twitterUrl ?? '',
      facebookUrl:  parsed.facebookUrl ?? '',
      instagramUrl: parsed.instagramUrl ?? '',
      pages:        parsed.pages,
    })
    updateTag('tihems-company')
    revalidatePath('/about', 'page')
    revalidatePath('/settings/company-page', 'page')
    return { success: true, message: 'Company page updated' }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, message: e.issues.map(i => i.message).join(', ') }
    return { success: false, message: extractError(e) }
  }
}
