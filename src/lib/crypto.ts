import crypto from 'crypto'

/**
 * Field-level encryption for sensitive Transaction Ledger columns
 * (patient/customer name, department/product, amount paid).
 *
 * This protects those three fields specifically against someone who gets
 * raw access to the underlying Google Sheet (bypassing the app entirely —
 * e.g. via an overly-broad Sheet share, or a leaked service-account key).
 * It is NOT a substitute for correct Sheet sharing permissions or secret
 * rotation — those still matter just as much. This is a second layer.
 *
 * AES-256-GCM: authenticated encryption, so a tampered or corrupted cell
 * fails to decrypt loudly (returns a visible warning) rather than silently
 * returning wrong data.
 *
 * Key: LEDGER_ENCRYPTION_KEY env var, base64-encoded, must decode to
 * exactly 32 bytes. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Store it ONLY in Vercel's environment variables (Production + Preview).
 * Never commit it, never paste it in chat, never put it in the Sheet.
 *
 * ⚠️ If this key is ever lost (not leaked — lost), every encrypted cell
 * becomes permanently unrecoverable. Keep a secure backup of it (e.g. a
 * password manager's secure notes) separate from Vercel itself.
 */

const ALGO   = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_LEN = 12   // recommended nonce size for GCM
const TAG_LEN = 16

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.LEDGER_ENCRYPTION_KEY
  if (!raw) throw new Error('LEDGER_ENCRYPTION_KEY is not set. Required to read or write the Transaction Ledger.')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('LEDGER_ENCRYPTION_KEY must be base64 and decode to exactly 32 bytes.')
  cachedKey = key
  return key
}

/** Encrypts a plain string. Empty string stays empty (never obscure a genuinely blank cell). */
export function encryptField(plaintext: string): string {
  if (plaintext === '') return ''
  const iv     = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
}

/**
 * Decrypts a cell. Values without the enc:v1: prefix are treated as legacy
 * plaintext (pre-migration rows) and returned unchanged — so old rows keep
 * displaying correctly until they're migrated or next edited.
 */
export function decryptField(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
    const iv  = raw.subarray(0, IV_LEN)
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const enc = raw.subarray(IV_LEN + TAG_LEN)
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    // Wrong key, corrupted cell, or tampered ciphertext — never silently
    // show something that looks like real data but isn't.
    return '⚠️ Unable to decrypt'
  }
}

/** amountPaid is numeric everywhere in the app — these wrap the string codec so callers never touch encoding directly. */
export function encryptAmount(n: number): string {
  return encryptField(String(n))
}
export function decryptAmount(value: string): number {
  const decrypted = decryptField(value)
  const n = Number(decrypted)
  return Number.isFinite(n) ? n : 0
}
