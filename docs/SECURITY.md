# Ledger Encryption

How and why patient/customer name, department (product), and amount paid
are encrypted at rest in the Transaction Ledger — setup, migration, and
what it does and doesn't protect against.

---

## Why this exists

The app's database is a Google Sheet. The app's own login (Google OAuth +
shared-password fallback) only protects access *through the app* — it does
nothing to stop someone who gets access to the raw Google Sheet directly
(e.g. an overly-broad Sheet share, or a leaked service-account key) from
reading every patient name, department, and amount in plain text.

Field-level encryption closes that specific gap: those three fields are
unreadable in the raw Sheet without the encryption key, even to someone
with direct Sheet access.

**This is a second layer, not a replacement for the basics.** It doesn't
help if:
- The Sheet itself is shared too broadly (check **Share** on the Sheet —
  it should only ever list the service account's `client_email`, nothing
  else, not even "anyone in your organization").
- The encryption key itself leaks (treat `LEDGER_ENCRYPTION_KEY` exactly
  like `AUTH_SECRET` or any other production secret).
- Someone has a legitimate, logged-in session in the app — the app
  decrypts transparently for anyone it lets in, same as before.

---

## What's encrypted

| Field | Column | Encrypted |
|---|---|---|
| Customer/Patient name | E | ✅ |
| Department (Product)  | G | ✅ |
| Amount Paid           | J | ✅ |
| Region/Branch, Gateway, Sales Rep, Status, Date, Notes, Reference # | — | ❌ (unchanged, plaintext) |

Region/Gateway/SalesRep/Status stay plaintext because they're used as
grouping/filter dimensions across Analysis, Reports, and Targets, and
aren't individually identifying on their own. Name, department, and amount
are the fields that are actually sensitive in combination.

---

## How it works

**Algorithm:** AES-256-GCM (authenticated encryption — a tampered or
corrupted cell fails to decrypt loudly, rather than silently returning
wrong data).

**Where:** `src/lib/crypto.ts` (`encryptField` / `decryptField` /
`encryptAmount` / `decryptAmount`). Wired into `src/lib/sheets.ts` at the
only two points that actually touch the raw Sheet cells:
- **Read** (`rowToTransaction`) — decrypts on the way out of the Sheet.
- **Write** (`createTransaction`, `bulkCreateTransactions`,
  `updateTransaction`) — encrypts on the way in.

Every other part of the app — Analysis, Reports, Targets matching, the
Overview dashboard, CSV/Excel import/export — only ever touches the
already-decrypted `TransactionRecord` objects in memory. None of that code
had to change or know encryption exists.

**Legacy rows:** a cell is only treated as encrypted if it starts with the
`enc:v1:` prefix. Anything else (including every row that existed before
this feature) is treated as plaintext and passed through unchanged, so
nothing breaks mid-migration.

---

## Audit log — what changed

Before this feature, every create/edit/delete wrote the patient name,
department, and amount **in plaintext** into the Audit sheet's `Details`
column — a second, unencrypted copy of the exact data this feature exists
to protect. That's been redacted: audit entries now log the transaction
ID, gateway, date, and reference number (still fully useful for tracking
who changed what, when) without duplicating the encrypted fields anywhere
else.

---

## Setup (do this once)

### 1. Generate a key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Add it to Vercel

Project → **Settings → Environment Variables** → add `LEDGER_ENCRYPTION_KEY`
with the value from step 1, scoped to **Production** and **Preview**.

**Back this key up somewhere safe, separate from Vercel** — a password
manager, a written note, whatever you actually trust. There is no reset
and no recovery: if the key is lost, every encrypted cell is permanently
unreadable, forever. If it leaks, rotating it does *not* re-encrypt
already-written cells with a new key — treat a leak as "assume the old
cells are exposed" and rotate the key going forward for new writes only,
same as you would for any other leaked secret.

### 3. Redeploy

Environment variable changes only take effect on the *next* deployment —
adding the variable alone isn't enough, redeploy after adding it.

### 4. Migrate existing rows (one time)

While logged in as **Admin**, visit:

```
https://<your-deployed-url>/api/admin/migrate-encrypt-ledger
```

This encrypts every existing plaintext row. It's safe to visit more than
once — already-encrypted rows are detected and skipped, so nothing gets
double-encrypted. It returns a JSON summary:

```json
{ "ok": true, "totalRows": 142, "migrated": 142, "alreadyEncrypted": 0 }
```

After this, every new transaction created through the app is encrypted
automatically — no further action needed.

---

## If a cell shows "⚠️ Unable to decrypt"

This means either: the encryption key in your environment doesn't match
the one that encrypted that cell (e.g. a key was rotated without
re-encrypting old data), or the cell was corrupted/tampered with directly
in the Sheet. It will **not** silently show wrong data — it fails visibly
instead. If you see this, check that `LEDGER_ENCRYPTION_KEY` in Vercel
matches what you expect before assuming data loss.
