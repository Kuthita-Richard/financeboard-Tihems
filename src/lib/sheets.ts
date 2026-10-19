/**
 * lib/sheets.ts — Google Sheets data layer
 *
 * Two primary tables:
 *  Transactions — daily ledger entries (one row per customer transaction)
 *  Targets      — admin-set targets per dimension per month
 *
 * Performance is COMPUTED at query time by joining both tables.
 * It is never stored.
 */

import { google }         from 'googleapis'
import { unstable_cache } from 'next/cache'
import {
  TransactionRecord, TransactionInput,
  TargetRecord, TargetInput,
  OrgMetadata, OrgSettings, TihemsCompanyInfo, TihemsCompanyPage,
  AuthorizedUser, DimensionType, SchemeDepartmentMapping, SchemeSalesRepMapping,
} from '@/types'
import { generateId, safeParseNumber, DEFAULT_SETTINGS, DEFAULT_TIHEMS_COMPANY, MONTHS } from '@/lib/utils'
import { encryptField, decryptField, encryptAmount, decryptAmount } from '@/lib/crypto'

// ── Sheet names ───────────────────────────────────────────────
const SHEETS = {
  TX:          'Transactions',
  TARGETS:     'Targets',
  METADATA:    'Metadata',
  SETTINGS:    'Settings',
  AUDIT:       'AuditLog',
  USERS:       'AuthorizedUsers',
  TIHEMS:      'TihemsCompany',
  SCHEME_MAP:  'SchemeDepartmentMap',
  SALESREP_MAP: 'SchemeSalesRepMap',
} as const

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// ── Transaction headers ───────────────────────────────────────
// A:O (15 columns)
const TX_HEADERS = [
  'ID', 'Date', 'Year', 'Month',
  'CustomerName', 'Region', 'Product', 'Gateway', 'SalesRep',
  'AmountPaid', 'Status', 'Notes',
  'RecordedBy', 'RecordedByEmail', 'RecordedAt',
  'ReferenceNumber', 'ImportBatchID',
]

// ── Target headers ────────────────────────────────────────────
// A:N (14 columns). Region (N) was added later — appended at the end
// rather than inserted, so existing rows don't shift and old rows simply
// read as blank/unassigned Region until edited (see docs/TARGETS_MODEL.md).
const TARGET_HEADERS = [
  'ID', 'Year', 'Month', 'DimensionType', 'DimensionValue',
  'AmountAnnualTarget', 'AmountRevisedTarget',
  'CountAnnualTarget', 'CountRevisedTarget',
  'Active', 'SetBy', 'SetAt', 'Notes', 'Region',
]

// ── Scheme → Department map headers ─────────────────────────────
const SCHEME_MAP_HEADERS = ['Gateway', 'Department']
const SALESREP_MAP_HEADERS = ['Gateway', 'SalesRep']

// ── Google Auth ───────────────────────────────────────────────
function getSheetsClient() {
  const privateKey   = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail  = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  if (!privateKey || !clientEmail)
    throw new Error('Google Sheets credentials not configured in environment variables.')
  const auth = new google.auth.GoogleAuth({
    credentials: { private_key: privateKey, client_email: clientEmail },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// ── Low-level helpers ─────────────────────────────────────────
async function getSheetValues(range: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range })
  return (res.data.values ?? []) as string[][]
}

async function appendRows(sheet: string, rows: unknown[][]): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId:    SPREADSHEET_ID,
    range:            `${sheet}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody:      { values: rows },
  })
}

async function updateCell(range: string, values: unknown[][]): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId:    SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody:      { values },
  })
}

async function ensureHeaders(sheet: string, headers: string[]): Promise<void> {
  const existing = await getSheetValues(`${sheet}!A1:A1`)
  if (!existing.length || !existing[0][0]) {
    await appendRows(sheet, [headers])
  }
}

// ─────────────────────────────────────────────────────────────
// TRANSACTION OPERATIONS
// ─────────────────────────────────────────────────────────────

function rowToTransaction(row: string[], rowIndex: number): TransactionRecord {
  return {
    id:              row[0]  || '',
    rowIndex,
    date:            row[1]  || '',
    year:            safeParseNumber(row[2]),
    month:           row[3]  || '',
    customerName:    decryptField(row[4]  || ''),
    region:          row[5]  || '',
    product:         decryptField(row[6]  || ''),
    gateway:         row[7]  || '',
    salesRep:        row[8]  || '',
    amountPaid:      decryptAmount(row[9] || ''),
    status:          (row[10] as 'Active' | 'Inactive') || 'Active',
    notes:           row[11] || '',
    recordedBy:      row[12] || '',
    recordedByEmail: row[13] || '',
    recordedAt:      row[14] || '',
    referenceNumber: row[15] || '',
    importBatchId:   row[16] || '',
  }
}

async function _getTransactions(): Promise<TransactionRecord[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.TX}!A:Q`)
    if (rows.length < 2) return []
    return rows.slice(1)
      .map((r, i) => ({ r, rowIndex: i + 2 }))
      .filter(x => x.r[0])
      .map(x => rowToTransaction(x.r, x.rowIndex))
  } catch { return [] }
}

export const getTransactions = unstable_cache(
  async () => _getTransactions(),
  ['transactions'],
  { tags: ['transactions'], revalidate: 300 }
)

export async function createTransaction(
  input: TransactionInput,
  user: { name: string; email: string }
): Promise<TransactionRecord> {
  await ensureHeaders(SHEETS.TX, TX_HEADERS)
  const date  = new Date(input.date)
  const record: TransactionRecord = {
    id:              generateId('TXN-'),
    rowIndex:        -1,  // unknown until the next fetch — this record is only used for its id/message here
    date:            input.date,
    year:            date.getFullYear(),
    month:           MONTHS[date.getMonth()],
    customerName:    input.customerName,
    region:          input.region,
    product:         input.product,
    gateway:         input.gateway,
    salesRep:        input.salesRep,
    amountPaid:      input.amountPaid,
    status:          input.status,
    referenceNumber: input.referenceNumber || '',
    notes:           input.notes || '',
    recordedBy:      user.name,
    recordedByEmail: user.email,
    recordedAt:      new Date().toISOString(),
    importBatchId:   '',   // manual single-entry rows are never part of an import batch
  }
  await appendRows(SHEETS.TX, [[
    record.id, record.date, record.year, record.month,
    encryptField(record.customerName), record.region, encryptField(record.product),
    record.gateway, record.salesRep, encryptAmount(record.amountPaid),
    record.status, record.notes,
    record.recordedBy, record.recordedByEmail, record.recordedAt,
    record.referenceNumber, record.importBatchId,
  ]])
  return record
}

export async function bulkCreateTransactions(
  inputs: TransactionInput[],
  user: { name: string; email: string }
): Promise<{ success: number; failed: number; errors: string[]; importBatchId: string }> {
  await ensureHeaders(SHEETS.TX, TX_HEADERS)
  // One shared ID for every row from this single import — this is what
  // makes "reverse this import" possible as one grouped action instead of
  // needing to hand-pick every row it touched.
  const importBatchId = generateId('IMP-')
  const rows: unknown[][] = []
  const errors: string[]  = []
  inputs.forEach((input, i) => {
    try {
      const date = new Date(input.date)
      rows.push([
        generateId('TXN-'), input.date, date.getFullYear(), MONTHS[date.getMonth()],
        encryptField(input.customerName), input.region, encryptField(input.product),
        input.gateway, input.salesRep, encryptAmount(input.amountPaid),
        input.status, input.notes || '',
        user.name, user.email, new Date().toISOString(),
        input.referenceNumber || '', importBatchId,
      ])
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Invalid'}`)
    }
  })
  if (rows.length) await appendRows(SHEETS.TX, rows)
  return { success: rows.length, failed: errors.length, errors, importBatchId }
}

export async function updateTransaction(
  rowIndex: number,  // physical spreadsheet row (as returned in TransactionRecord.rowIndex)
  input: TransactionInput,
  preserved: { recordedBy: string; recordedByEmail: string; recordedAt: string; importBatchId: string }
): Promise<void> {
  const date = new Date(input.date)
  await updateCell(`${SHEETS.TX}!B${rowIndex}:Q${rowIndex}`, [[
    input.date, date.getFullYear(), MONTHS[date.getMonth()],
    encryptField(input.customerName), input.region, encryptField(input.product),
    input.gateway, input.salesRep, encryptAmount(input.amountPaid),
    input.status, input.notes || '',
    preserved.recordedBy, preserved.recordedByEmail, preserved.recordedAt,
    input.referenceNumber || '', preserved.importBatchId,
  ]])
}

/**
 * Reverses an entire import in one action: finds every row sharing the
 * given importBatchId and soft-deletes them the same way a single delete
 * works (blanking the ID cell — cheap, no row-shifting, and consistent
 * with every other delete in this app). Returns how many rows were
 * actually removed, since the caller can't know that in advance.
 */
export async function deleteTransactionsByImportBatch(importBatchId: string): Promise<number> {
  const rows = await getSheetValues(`${SHEETS.TX}!A:Q`)
  if (rows.length < 2) return 0
  const matches = rows.slice(1)
    .map((r, i) => ({ r, rowIndex: i + 2 }))
    .filter(x => x.r[0] && x.r[16] === importBatchId)
  for (const { rowIndex } of matches) {
    await updateCell(`${SHEETS.TX}!A${rowIndex}`, [['']])
  }
  return matches.length
}

export async function deleteTransaction(rowIndex: number): Promise<void> {
  // Clearing the ID cell is enough — _getTransactions already filters out
  // any row with a blank ID, so this is a real, immediate delete from the
  // app's point of view without needing to shift every row below it up.
  await updateCell(`${SHEETS.TX}!A${rowIndex}`, [['']])
}

/**
 * One-time migration: encrypts customerName/product/amountPaid on every
 * existing ledger row that's still plaintext (pre-dates the encryption
 * feature). Idempotent and safe to re-run — any row whose cells already
 * carry the enc:v1: prefix is left untouched, so running this twice (or on
 * a ledger that's a mix of old and new rows) never double-encrypts.
 * Triggered via GET /api/admin/migrate-encrypt-ledger, Admin-only.
 */
export async function migrateEncryptLedger(): Promise<{ totalRows: number; migrated: number; alreadyEncrypted: number }> {
  const rows = await getSheetValues(`${SHEETS.TX}!A:P`)
  if (rows.length < 2) return { totalRows: 0, migrated: 0, alreadyEncrypted: 0 }

  let migrated = 0, alreadyEncrypted = 0
  const dataRows = rows.slice(1).map((r, i) => ({ r, rowIndex: i + 2 })).filter(x => x.r[0])

  for (const { r, rowIndex } of dataRows) {
    const nameCell = r[4] || '', productCell = r[6] || '', amountCell = r[9] || ''
    const alreadyDone = nameCell.startsWith('enc:v1:') && productCell.startsWith('enc:v1:') && amountCell.startsWith('enc:v1:')
    if (alreadyDone) { alreadyEncrypted++; continue }

    await updateCell(`${SHEETS.TX}!E${rowIndex}:J${rowIndex}`, [[
      encryptField(nameCell), r[5] || '', encryptField(productCell),
      r[7] || '', r[8] || '', encryptAmount(Number(amountCell) || safeParseNumber(amountCell)),
    ]])
    migrated++
  }

  return { totalRows: dataRows.length, migrated, alreadyEncrypted }
}

// ─────────────────────────────────────────────────────────────
// TARGET OPERATIONS
// ─────────────────────────────────────────────────────────────

function rowToTarget(row: string[], rowIndex: number): TargetRecord {
  return {
    id:                  row[0]  || '',
    rowIndex,
    year:                safeParseNumber(row[1]),
    month:               row[2]  || '',
    dimensionType:       (row[3] as DimensionType) || 'Overall',
    dimensionValue:      row[4]  || '',
    amountAnnualTarget:  safeParseNumber(row[5]),
    amountRevisedTarget: safeParseNumber(row[6]),
    countAnnualTarget:   safeParseNumber(row[7]),
    countRevisedTarget:  safeParseNumber(row[8]),
    active:              row[9]  !== 'false' && row[9] !== 'FALSE' && row[9] !== '0',
    setBy:               row[10] || '',
    setAt:               row[11] || '',
    notes:               row[12] || '',
    region:              row[13] || '',
  }
}

async function _getTargets(): Promise<TargetRecord[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.TARGETS}!A:N`)
    if (rows.length < 2) return []
    return rows.slice(1)
      .map((r, i) => ({ r, rowIndex: i + 2 }))  // physical row = index + header row + 1-based
      .filter(x => x.r[0])
      .map(x => rowToTarget(x.r, x.rowIndex))
  } catch { return [] }
}

export const getTargets = unstable_cache(
  async () => _getTargets(),
  ['targets'],
  { tags: ['targets'], revalidate: 600 }
)

export async function createTarget(
  input: TargetInput,
  user: { name: string; email: string }
): Promise<TargetRecord> {
  await ensureHeaders(SHEETS.TARGETS, TARGET_HEADERS)
  const record: TargetRecord = {
    id:                  generateId('TGT-'),
    rowIndex:            -1,  // unknown until the next fetch — this record is only used for its id/message here
    year:                input.year,
    month:               input.month,
    dimensionType:       input.dimensionType,
    dimensionValue:      input.dimensionValue,
    region:              input.region || '',
    amountAnnualTarget:  input.amountAnnualTarget,
    amountRevisedTarget: input.amountRevisedTarget,
    countAnnualTarget:   input.countAnnualTarget,
    countRevisedTarget:  input.countRevisedTarget,
    active:              input.active,
    setBy:               user.name,
    setAt:               new Date().toISOString(),
    notes:               input.notes || '',
  }
  await appendRows(SHEETS.TARGETS, [[
    record.id, record.year, record.month,
    record.dimensionType, record.dimensionValue,
    record.amountAnnualTarget, record.amountRevisedTarget,
    record.countAnnualTarget, record.countRevisedTarget,
    record.active, record.setBy, record.setAt, record.notes, record.region,
  ]])
  return record
}

export async function updateTarget(
  rowIndex: number,  // physical spreadsheet row (as returned in TargetRecord.rowIndex)
  input: TargetInput,
  user: { name: string; email: string }
): Promise<void> {
  await updateCell(`${SHEETS.TARGETS}!B${rowIndex}:N${rowIndex}`, [[
    input.year, input.month, input.dimensionType, input.dimensionValue,
    input.amountAnnualTarget, input.amountRevisedTarget,
    input.countAnnualTarget, input.countRevisedTarget,
    input.active, user.name, new Date().toISOString(), input.notes || '', input.region || '',
  ]])
}

export async function deleteTarget(rowIndex: number): Promise<void> {
  // Clearing the ID cell is enough — _getTargets already filters out any
  // row with a blank ID, so this is a real, immediate delete from the
  // app's point of view without needing to shift every row below it up.
  await updateCell(`${SHEETS.TARGETS}!A${rowIndex}`, [['']])
}

// ─────────────────────────────────────────────────────────────
// SCHEME → DEPARTMENT MAP
// Every Payment Scheme (Gateway) belongs to exactly one Department
// (Product) — see docs/TARGETS_MODEL.md. Drives the Department target
// roll-up in computePerformance. Stored as a flat two-column sheet;
// re-mapping a scheme overwrites its existing row rather than appending
// a duplicate, so a scheme never resolves to two departments at once.
// ─────────────────────────────────────────────────────────────

async function _getSchemeDepartmentMap(): Promise<SchemeDepartmentMapping[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.SCHEME_MAP}!A:B`)
    if (rows.length < 2) return []
    return rows.slice(1)
      .filter(r => r[0])
      .map(r => ({ gateway: r[0], department: r[1] || '' }))
  } catch { return [] }
}

export const getSchemeDepartmentMap = unstable_cache(
  async () => _getSchemeDepartmentMap(),
  ['scheme-department-map'],
  { tags: ['scheme-department-map'], revalidate: 1800 }
)

/** Assigns a scheme to a department — overwrites the existing row for that scheme if one exists. */
export async function setSchemeDepartment(gateway: string, department: string): Promise<void> {
  await ensureHeaders(SHEETS.SCHEME_MAP, SCHEME_MAP_HEADERS)
  const rows = await getSheetValues(`${SHEETS.SCHEME_MAP}!A:B`)
  const existingIdx = rows.findIndex((r, i) => i > 0 && r[0] === gateway)
  if (existingIdx === -1) {
    await appendRows(SHEETS.SCHEME_MAP, [[gateway, department]])
  } else {
    await updateCell(`${SHEETS.SCHEME_MAP}!A${existingIdx + 1}:B${existingIdx + 1}`, [[gateway, department]])
  }
}

/** Removes a scheme's department assignment — it stops counting toward any department's total until re-mapped. */
export async function removeSchemeDepartment(gateway: string): Promise<void> {
  const rows = await getSheetValues(`${SHEETS.SCHEME_MAP}!A:B`)
  const existingIdx = rows.findIndex((r, i) => i > 0 && r[0] === gateway)
  if (existingIdx === -1) return
  await updateCell(`${SHEETS.SCHEME_MAP}!A${existingIdx + 1}:B${existingIdx + 1}`, [['', '']])
}

// ─────────────────────────────────────────────────────────────
// SCHEME → SALES REP MAP
// Mirrors the Department map exactly, same reasoning: Sales Rep is no
// longer a manually-entered target dimension (see docs/TARGETS_MODEL.md)
// — its target is the sum of every Payment Scheme target whose scheme is
// mapped to that rep here.
// ─────────────────────────────────────────────────────────────

async function _getSchemeSalesRepMap(): Promise<SchemeSalesRepMapping[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.SALESREP_MAP}!A:B`)
    if (rows.length < 2) return []
    return rows.slice(1)
      .filter(r => r[0])
      .map(r => ({ gateway: r[0], salesRep: r[1] || '' }))
  } catch { return [] }
}

export const getSchemeSalesRepMap = unstable_cache(
  async () => _getSchemeSalesRepMap(),
  ['scheme-salesrep-map'],
  { tags: ['scheme-salesrep-map'], revalidate: 1800 }
)

/** Assigns a scheme to a sales rep — overwrites the existing row for that scheme if one exists. */
export async function setSchemeSalesRep(gateway: string, salesRep: string): Promise<void> {
  await ensureHeaders(SHEETS.SALESREP_MAP, SALESREP_MAP_HEADERS)
  const rows = await getSheetValues(`${SHEETS.SALESREP_MAP}!A:B`)
  const existingIdx = rows.findIndex((r, i) => i > 0 && r[0] === gateway)
  if (existingIdx === -1) {
    await appendRows(SHEETS.SALESREP_MAP, [[gateway, salesRep]])
  } else {
    await updateCell(`${SHEETS.SALESREP_MAP}!A${existingIdx + 1}:B${existingIdx + 1}`, [[gateway, salesRep]])
  }
}

/** Removes a scheme's sales rep assignment — it stops counting toward any rep's total until re-mapped. */
export async function removeSchemeSalesRep(gateway: string): Promise<void> {
  const rows = await getSheetValues(`${SHEETS.SALESREP_MAP}!A:B`)
  const existingIdx = rows.findIndex((r, i) => i > 0 && r[0] === gateway)
  if (existingIdx === -1) return
  await updateCell(`${SHEETS.SALESREP_MAP}!A${existingIdx + 1}:B${existingIdx + 1}`, [['', '']])
}

// ─────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────

async function _getMetadata(): Promise<OrgMetadata> {
  try {
    // A: Products  B: Gateways  C: Regions  D: SalesReps  E: Statuses  F: Customers
    const rows = await getSheetValues(`${SHEETS.METADATA}!A:F`)
    const data = rows.slice(1)
    return {
      products:  data.map(r => r[0]).filter(Boolean),
      gateways:  data.map(r => r[1]).filter(Boolean),
      regions:   data.map(r => r[2]).filter(Boolean),
      salesReps: data.map(r => r[3]).filter(Boolean),
      statuses:  data.map(r => r[4]).filter(Boolean).length
                 ? data.map(r => r[4]).filter(Boolean)
                 : ['Active', 'Inactive'],
      customers: data.map(r => r[5]).filter(Boolean),
    }
  } catch {
    return { products: [], gateways: [], regions: [], salesReps: [], customers: [], statuses: ['Active', 'Inactive'] }
  }
}

export const getMetadata = unstable_cache(
  async () => _getMetadata(),
  ['metadata'],
  { tags: ['metadata'], revalidate: 1800 }
)

export async function addMetadataItem(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  value: string
): Promise<void> {
  const colMap = { products: 'A', gateways: 'B', regions: 'C', salesReps: 'D', customers: 'F' }
  const col  = colMap[column]
  const rows = await getSheetValues(`${SHEETS.METADATA}!${col}:${col}`)
  await updateCell(`${SHEETS.METADATA}!${col}${rows.length + 1}`, [[value]])
}

/**
 * Rename a Data Lists entry in place (same cell, same row — no shift).
 * This only renames the registry entry itself. It does NOT touch historical
 * Transaction or Target rows that already reference the old text — those
 * keep the old value verbatim, since silently rewriting the ledger on a
 * rename is a much bigger, riskier operation than the registry edit itself.
 */
export async function editMetadataItem(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  oldValue: string,
  newValue: string
): Promise<void> {
  const colMap = { products: 'A', gateways: 'B', regions: 'C', salesReps: 'D', customers: 'F' }
  const col  = colMap[column]
  const rows = await getSheetValues(`${SHEETS.METADATA}!${col}:${col}`)
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === oldValue)
  if (rowIdx === -1) throw new Error(`"${oldValue}" was not found in the list — it may have already been edited or removed.`)
  await updateCell(`${SHEETS.METADATA}!${col}${rowIdx + 1}`, [[newValue]])
}

/**
 * Remove a Data Lists entry by blanking its cell (same soft-delete pattern
 * used for Targets — filter(Boolean) on read means a blank cell simply
 * disappears from the list, with no need to shift every row below it up).
 * This only stops the value from being pre-registered going forward. If the
 * value has already been used in real transactions, it will keep appearing
 * in Entry/Targets/Ledger-edit dropdowns via the ledger-derived half of the
 * union until no transaction references it anymore.
 */
export async function deleteMetadataItem(
  column: 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers',
  value: string
): Promise<void> {
  const colMap = { products: 'A', gateways: 'B', regions: 'C', salesReps: 'D', customers: 'F' }
  const col  = colMap[column]
  const rows = await getSheetValues(`${SHEETS.METADATA}!${col}:${col}`)
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === value)
  if (rowIdx === -1) throw new Error(`"${value}" was not found in the list — it may have already been removed.`)
  await updateCell(`${SHEETS.METADATA}!${col}${rowIdx + 1}`, [['']])
}

// ─────────────────────────────────────────────────────────────
// ORG SETTINGS
// ─────────────────────────────────────────────────────────────

async function _getOrgSettings(): Promise<OrgSettings> {
  try {
    const rows = await getSheetValues(`${SHEETS.SETTINGS}!A:B`)
    const map: Record<string, string> = {}
    rows.forEach(r => { if (r[0]) map[r[0]] = r[1] || '' })
    return {
      orgName:             map.OrgName             || DEFAULT_SETTINGS.orgName,
      orgLegalName:        map.OrgLegalName         || DEFAULT_SETTINGS.orgLegalName,
      tagline:             map.Tagline              || DEFAULT_SETTINGS.tagline,
      logoUrlLight:        map.LogoUrlLight         || '',
      logoUrlDark:         map.LogoUrlDark          || '',
      faviconUrl:          map.FaviconUrl           || '',
      websiteUrl:          map.WebsiteUrl           || '',
      logoUrlSecondary:      map.LogoUrlSecondary      || '',
      logoPositionSecondary: (map.LogoPositionSecondary as OrgSettings['logoPositionSecondary']) || DEFAULT_SETTINGS.logoPositionSecondary,
      logoUrlTertiary:       map.LogoUrlTertiary       || '',
      logoPositionTertiary:  (map.LogoPositionTertiary as OrgSettings['logoPositionTertiary'])  || DEFAULT_SETTINGS.logoPositionTertiary,
      primaryEmail:        map.PrimaryEmail         || '',
      supportEmail:        map.SupportEmail         || '',
      phoneNumber:         map.PhoneNumber          || '',
      address:             map.Address              || '',
      postalCode:          map.PostalCode           || '',
      linkedinUrl:         map.LinkedinUrl          || '',
      otherSocialUrl:      map.OtherSocialUrl       || '',
      primaryColor:        map.PrimaryColor         || DEFAULT_SETTINGS.primaryColor,
      secondaryColor:      map.SecondaryColor       || DEFAULT_SETTINGS.secondaryColor,
      sidebarColor:        map.SidebarColor         || DEFAULT_SETTINGS.sidebarColor,
      accentColor:         map.AccentColor          || DEFAULT_SETTINGS.accentColor,
      defaultMode:         (map.DefaultMode as OrgSettings['defaultMode']) || DEFAULT_SETTINGS.defaultMode,
      fontFamily:          map.FontFamily           || DEFAULT_SETTINGS.fontFamily,
      reportTitlePrefix:   map.ReportTitlePrefix    || DEFAULT_SETTINGS.reportTitlePrefix,
      preparedByDefault:   map.PreparedByDefault    || '',
      footerText:          map.FooterText           || DEFAULT_SETTINGS.footerText,
      currencySymbol:      map.CurrencySymbol       || DEFAULT_SETTINGS.currencySymbol,
      currencyCode:        map.CurrencyCode         || DEFAULT_SETTINGS.currencyCode,
      currencyFormat:      (map.CurrencyFormat as OrgSettings['currencyFormat']) || DEFAULT_SETTINGS.currencyFormat,
      dateFormat:          (map.DateFormat as OrgSettings['dateFormat'])         || DEFAULT_SETTINGS.dateFormat,
      fiscalYearStart:     map.FiscalYearStart      || DEFAULT_SETTINGS.fiscalYearStart,
      includeWatermark:    map.IncludeWatermark === 'true',
      watermarkText:       map.WatermarkText        || DEFAULT_SETTINGS.watermarkText,
      showRecordedBy:      map.ShowRecordedBy !== 'false',
      productLabel:        map.ProductLabel         || DEFAULT_SETTINGS.productLabel,
      gatewayLabel:        map.GatewayLabel         || DEFAULT_SETTINGS.gatewayLabel,
      regionLabel:         map.RegionLabel          || DEFAULT_SETTINGS.regionLabel,
      salesRepLabel:       map.SalesRepLabel        || DEFAULT_SETTINGS.salesRepLabel,
      customerLabel:       map.CustomerLabel        || DEFAULT_SETTINGS.customerLabel,
      perfThresholdExceeding: safeParseNumber(map.PerfThresholdExceeding) || DEFAULT_SETTINGS.perfThresholdExceeding,
      perfThresholdOnTrack:   safeParseNumber(map.PerfThresholdOnTrack)   || DEFAULT_SETTINGS.perfThresholdOnTrack,
      perfThresholdAtRisk:    safeParseNumber(map.PerfThresholdAtRisk)    || DEFAULT_SETTINGS.perfThresholdAtRisk,
      requireEntryNotes:   map.RequireEntryNotes === 'true',
    }
  } catch { return DEFAULT_SETTINGS }
}

export const getOrgSettings = unstable_cache(
  async () => _getOrgSettings(),
  ['org-settings'],
  { tags: ['org-settings'], revalidate: 3600 }
)

export async function updateOrgSettings(updates: Partial<OrgSettings>): Promise<void> {
  const keyMap: Record<string, string> = {
    orgName:'OrgName', orgLegalName:'OrgLegalName', tagline:'Tagline',
    logoUrlLight:'LogoUrlLight', logoUrlDark:'LogoUrlDark', faviconUrl:'FaviconUrl',
    websiteUrl:'WebsiteUrl', primaryEmail:'PrimaryEmail', supportEmail:'SupportEmail',
    logoUrlSecondary:'LogoUrlSecondary', logoPositionSecondary:'LogoPositionSecondary',
    logoUrlTertiary:'LogoUrlTertiary', logoPositionTertiary:'LogoPositionTertiary',
    phoneNumber:'PhoneNumber', address:'Address', postalCode:'PostalCode',
    linkedinUrl:'LinkedinUrl', otherSocialUrl:'OtherSocialUrl',
    primaryColor:'PrimaryColor', secondaryColor:'SecondaryColor',
    sidebarColor:'SidebarColor', accentColor:'AccentColor',
    defaultMode:'DefaultMode', fontFamily:'FontFamily',
    reportTitlePrefix:'ReportTitlePrefix', preparedByDefault:'PreparedByDefault',
    footerText:'FooterText', currencySymbol:'CurrencySymbol', currencyCode:'CurrencyCode',
    currencyFormat:'CurrencyFormat', dateFormat:'DateFormat',
    fiscalYearStart:'FiscalYearStart', includeWatermark:'IncludeWatermark',
    watermarkText:'WatermarkText', showRecordedBy:'ShowRecordedBy',
    productLabel:'ProductLabel', gatewayLabel:'GatewayLabel',
    regionLabel:'RegionLabel', salesRepLabel:'SalesRepLabel', customerLabel:'CustomerLabel',
    perfThresholdExceeding:'PerfThresholdExceeding',
    perfThresholdOnTrack:'PerfThresholdOnTrack', perfThresholdAtRisk:'PerfThresholdAtRisk',
    requireEntryNotes:'RequireEntryNotes',
  }
  const existing = await getSheetValues(`${SHEETS.SETTINGS}!A:B`)
  const rowMap   = new Map<string, number>()
  existing.forEach((r, i) => { if (r[0]) rowMap.set(r[0], i + 1) })
  const sheets = getSheetsClient()
  for (const [jsKey, value] of Object.entries(updates)) {
    const sheetKey = keyMap[jsKey]
    if (!sheetKey) continue
    const stringVal = String(value ?? '')
    const existingRow = rowMap.get(sheetKey)
    if (existingRow) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.SETTINGS}!B${existingRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[stringVal]] },
      })
    } else {
      await appendRows(SHEETS.SETTINGS, [[sheetKey, stringVal]])
    }
  }
}

// ── Tihems platform company info ────────────────────────────────
// Deliberately separate from OrgSettings above — this describes Tihems
// itself (the vendor), not the client organization using this instance.
async function _getTihemsCompanyInfo(): Promise<TihemsCompanyInfo> {
  try {
    const rows = await getSheetValues(`${SHEETS.TIHEMS}!A:B`)
    const map: Record<string, string> = {}
    rows.forEach(r => { if (r[0]) map[r[0]] = r[1] || '' })
    let pages: TihemsCompanyPage[] = DEFAULT_TIHEMS_COMPANY.pages
    if (map.Pages) {
      try { pages = JSON.parse(map.Pages) } catch { /* keep default on malformed JSON */ }
    }
    return {
      companyName:  map.CompanyName  || DEFAULT_TIHEMS_COMPANY.companyName,
      tagline:      map.Tagline      || DEFAULT_TIHEMS_COMPANY.tagline,
      email:        map.Email        || '',
      phone:        map.Phone        || '',
      address:      map.Address      || '',
      website:      map.Website      || '',
      linkedinUrl:  map.LinkedinUrl  || '',
      twitterUrl:   map.TwitterUrl   || '',
      facebookUrl:  map.FacebookUrl  || '',
      instagramUrl: map.InstagramUrl || '',
      pages,
    }
  } catch { return DEFAULT_TIHEMS_COMPANY }
}

export const getTihemsCompanyInfo = unstable_cache(
  async () => _getTihemsCompanyInfo(),
  ['tihems-company'],
  { tags: ['tihems-company'], revalidate: 3600 }
)

export async function updateTihemsCompanyInfo(info: TihemsCompanyInfo): Promise<void> {
  const flat: Record<string, string> = {
    CompanyName:  info.companyName,
    Tagline:      info.tagline,
    Email:        info.email,
    Phone:        info.phone,
    Address:      info.address,
    Website:      info.website,
    LinkedinUrl:  info.linkedinUrl,
    TwitterUrl:   info.twitterUrl,
    FacebookUrl:  info.facebookUrl,
    InstagramUrl: info.instagramUrl,
    Pages:        JSON.stringify(info.pages),
  }
  const existing = await getSheetValues(`${SHEETS.TIHEMS}!A:B`)
  const rowMap   = new Map<string, number>()
  existing.forEach((r, i) => { if (r[0]) rowMap.set(r[0], i + 1) })
  const sheets = getSheetsClient()
  for (const [sheetKey, value] of Object.entries(flat)) {
    const existingRow = rowMap.get(sheetKey)
    if (existingRow) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.TIHEMS}!B${existingRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[value]] },
      })
    } else {
      await appendRows(SHEETS.TIHEMS, [[sheetKey, value]])
    }
  }
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────

export async function logAuditEvent(
  action: string, entityId: string,
  userEmail: string, userName: string, details: string
): Promise<void> {
  try {
    await ensureHeaders(SHEETS.AUDIT, ['Timestamp','Action','EntityID','UserEmail','UserName','Details'])
    await appendRows(SHEETS.AUDIT, [[
      new Date().toISOString(), action, entityId, userEmail, userName, details,
    ]])
  } catch { /* Non-blocking */ }
}

// ─────────────────────────────────────────────────────────────
// AUTHORIZED USERS
// ─────────────────────────────────────────────────────────────

async function _getAuthorizedUsers(): Promise<AuthorizedUser[]> {
  try {
    const rows = await getSheetValues(`${SHEETS.USERS}!A:D`)
    return rows.slice(1).filter(r => r[0]).map(r => ({
      email: r[0], role: r[1] as AuthorizedUser['role'],
      addedAt: r[2] || '', addedBy: r[3] || '',
    }))
  } catch { return [] }
}

export const getAuthorizedUsers = unstable_cache(
  async () => _getAuthorizedUsers(),
  ['auth-users'],
  { tags: ['auth-users'], revalidate: 3600 }
)

export async function getUserRole(email: string): Promise<AuthorizedUser['role'] | null> {
  const users = await _getAuthorizedUsers()
  return users.find(u => u.email === email)?.role ?? null
}

export async function upsertAuthorizedUser(
  user: { email: string; role: string; addedBy: string }
): Promise<void> {
  await ensureHeaders(SHEETS.USERS, ['Email','Role','AddedAt','AddedBy'])
  const rows = await getSheetValues(`${SHEETS.USERS}!A:A`)
  const idx  = rows.findIndex(r => r[0] === user.email)
  const sheets = getSheetsClient()
  if (idx > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USERS}!A${idx+1}:D${idx+1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[user.email, user.role, new Date().toISOString(), user.addedBy]] },
    })
  } else {
    await appendRows(SHEETS.USERS, [[user.email, user.role, new Date().toISOString(), user.addedBy]])
  }
}

// ─────────────────────────────────────────────────────────────
// SPREADSHEET INITIALISATION
// ─────────────────────────────────────────────────────────────

export async function initializeSpreadsheet(): Promise<{ ok: boolean; message: string }> {
  try {
    const sheets = getSheetsClient()
    const meta   = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const existing = (meta.data.sheets ?? []).map(s => s.properties?.title ?? '')
    const needed   = Object.values(SHEETS)
    const missing  = needed.filter(s => !existing.includes(s))

    if (missing.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: missing.map(title => ({ addSheet: { properties: { title } } })),
        },
      })
    }

    // Seed Transactions headers
    const txCheck = await getSheetValues(`${SHEETS.TX}!A1:A1`)
    if (!txCheck.length || !txCheck[0][0]) {
      await appendRows(SHEETS.TX, [TX_HEADERS])
    }

    // Seed Targets headers
    const tgtCheck = await getSheetValues(`${SHEETS.TARGETS}!A1:A1`)
    if (!tgtCheck.length || !tgtCheck[0][0]) {
      await appendRows(SHEETS.TARGETS, [TARGET_HEADERS])
    }

    // Seed Metadata — A:Products B:Gateways C:Regions D:SalesReps E:Statuses F:Customers
    const metaCheck = await getSheetValues(`${SHEETS.METADATA}!A1:A1`)
    if (!metaCheck.length || !metaCheck[0][0]) {
      await appendRows(SHEETS.METADATA, [
        ['Products',  'Gateways',      'Regions', 'SalesReps',    'Statuses', 'Customers'],
        ['Product A', 'M-Pesa',        'North',   'Alice Johnson', 'Active',   'Acme Corp'],
        ['Product B', 'Stripe',        'South',   'Bob Smith',     'Inactive', 'Beta Ltd'],
        ['Product C', 'Bank Transfer', 'East',    'Carol White',   '',         'Gamma Inc'],
        ['Product D', 'PayPal',        'West',    'David Brown',   '',         'Delta Co'],
        ['',          'Cash',          'Central', 'Eve Davis',     '',         'Epsilon LLC'],
      ])
    }

    // Seed Users headers
    const usersCheck = await getSheetValues(`${SHEETS.USERS}!A1:A1`)
    if (!usersCheck.length || !usersCheck[0][0]) {
      await appendRows(SHEETS.USERS, [['Email','Role','AddedAt','AddedBy']])
    }

    // Seed Scheme→Department map headers
    const mapCheck = await getSheetValues(`${SHEETS.SCHEME_MAP}!A1:A1`)
    if (!mapCheck.length || !mapCheck[0][0]) {
      await appendRows(SHEETS.SCHEME_MAP, [SCHEME_MAP_HEADERS])
    }

    // Seed Scheme→SalesRep map headers
    const srMapCheck = await getSheetValues(`${SHEETS.SALESREP_MAP}!A1:A1`)
    if (!srMapCheck.length || !srMapCheck[0][0]) {
      await appendRows(SHEETS.SALESREP_MAP, [SALESREP_MAP_HEADERS])
    }

    return { ok: true, message: 'Spreadsheet initialised successfully' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Initialisation failed' }
  }
}
