# Setup Guide

Complete step-by-step guide to getting every credential and running Tihems for the first time.

---

## Overview

You need four things:

1. A **Google Sheet** (your data store)
2. A **Google Cloud Service Account** (lets the app read/write your sheet)
3. A **Google OAuth app** (lets users sign in with Google)
4. A **Vercel Blob store** (stores uploaded logos)

Everything else in `.env.local` you create yourself.

Estimated time: **20–30 minutes** on first setup.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it something like `Tihems Data`.
3. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit
   ```
4. Paste it into `.env.local`:
   ```
   GOOGLE_SPREADSHEET_ID=your-id-here
   ```

> The app will create all required tabs (SalesData, Targets, Metadata, Settings, AuditLog, AuthorizedUsers) automatically on first run. You do not need to create them manually.

---

## Step 2 — Create a Google Cloud Service Account

This gives the app permission to read and write your spreadsheet without a user being logged in.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. In the left sidebar: **APIs & Services → Library**
4. Search for **Google Sheets API** → click it → click **Enable**
5. In the left sidebar: **APIs & Services → Credentials**
6. Click **Create Credentials → Service Account**
7. Give it any name (e.g. `tihems-sheets`) → click **Done**
8. Click the service account you just created → go to the **Keys** tab
9. Click **Add Key → Create new key → JSON** → download the file
10. Open the JSON file. Copy these two values into `.env.local`:
    ```
    GOOGLE_SHEETS_CLIENT_EMAIL=   ← the "client_email" field
    GOOGLE_SHEETS_PRIVATE_KEY=    ← the "private_key" field (include the full -----BEGIN... -----END... block)
    ```

> **Important:** The private key contains literal `\n` characters. When pasting into `.env.local`, wrap it in double quotes:
> ```
> GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
> ```

11. Back in Google Sheets: click the **Share** button on your spreadsheet
12. Share it with the service account email (looks like `name@project.iam.gserviceaccount.com`)
13. Set role to **Editor** → click Send

---

## Step 3 — Set Up Google OAuth (for Sign In with Google)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → same project
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in app name, support email → Save
   - Scopes: add `email` and `profile`
   - Test users: add your own Gmail address
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Tihems`
   - Authorised redirect URIs — add ALL of these:
   ```
   https://tihems-three-wine.vercel.app/api/auth/callback/google
   https://your-vercel-app.vercel.app/api/auth/callback/google
   https://your-custom-domain.com/api/auth/callback/google
   ```
     (Add the localhost one now; add the production URLs after deployment)
4. Click **Create** → copy the Client ID and Client Secret into `.env.local`:
   ```
   AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=your-client-secret
   ```

---

## Step 4 — Generate AUTH_SECRET

This is a random string used to sign JWT session tokens. Generate one:

```bash
# Option A — use openssl (Mac/Linux/WSL)
openssl rand -base64 32

# Option B — use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option C — use https://generate-secret.vercel.app/32
```

Paste the result into `.env.local`:
```
AUTH_SECRET=your-generated-secret-here
```

> Never commit this value to Git. It is already in `.gitignore` via `.env.local`.

---

## Step 5 — Set Admin Emails

Add your own Gmail address (and any other admins) to `.env.local`:
```
ADMIN_EMAILS=you@gmail.com,colleague@gmail.com
```

Anyone in this list gets the Admin role automatically when they sign in with Google, even if they are not yet in the AuthorizedUsers sheet.

---

## Step 6 — Set the Shared Password (optional)

If you want to allow users without Google accounts to sign in:
```
SHARED_ACCESS_PASSWORD=choose-a-strong-password
```

These users sign in with their name + this password. Their name is used as the audit trail identifier.

Leave this blank to disable credential-based login.

---

## Step 7 — Set Up Vercel Blob (for logo uploads)

Vercel Blob stores uploaded logo and favicon images.

**For local development:**
1. Install the Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Create a Blob store in the Vercel dashboard: **Storage → Create → Blob**
4. Pull env vars locally: `vercel env pull .env.local`

This auto-adds `BLOB_READ_WRITE_TOKEN` to your `.env.local`.

**If you skip this for now:** logo upload will fail with an error, but everything else works. You can add it later.

---

## Step 8 — Complete `.env.local`

Your finished `.env.local` should look like this:

```bash
# Auth
AUTH_SECRET=your-generated-secret
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_URL=https://tihems-three-wine.vercel.app/

# Shared password (optional)
SHARED_ACCESS_PASSWORD=your-team-password

# Google Sheets
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=tihems-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Admins
ADMIN_EMAILS=you@gmail.com
```

---

## Step 9 — Run the App

```bash
npm run dev
```

Visit `https://tihems-three-wine.vercel.app/`. You will be redirected to the login page.

Sign in with your Google account (it must match an email in `ADMIN_EMAILS`).

On first load, the app calls `initializeSpreadsheet()` which creates all missing tabs in your Google Sheet. Check your sheet — you should see the tabs: SalesData, Targets, Metadata, Settings, AuditLog, AuthorizedUsers.

---

## First Things to Do After Sign-In

1. **Settings → Identity** — set your organisation name, upload logo
2. **Settings → Contact** — add email and address (appears in PDF footer)
3. **Settings → Branding** — choose your brand colours
4. **Settings → App Config** — rename labels (e.g. change "Product" to "Service")
5. **Settings → App Config → Authorised Users** — add team members
6. **Data Entry or Import** — add your first records
7. **Reports** — generate your first PDF

---

## Troubleshooting

### ERR_TOO_MANY_REDIRECTS
**Cause:** `AUTH_SECRET` is missing or `.env.local` was not created.
**Fix:** Ensure `.env.local` exists and contains `AUTH_SECRET`.

### "Google Sheets credentials not configured"
**Cause:** `GOOGLE_SHEETS_PRIVATE_KEY` or `GOOGLE_SHEETS_CLIENT_EMAIL` is missing.
**Fix:** Check Step 2. Ensure the private key is in double quotes with `\n` preserved.

### "The caller does not have permission"
**Cause:** The spreadsheet was not shared with the service account email.
**Fix:** Open your Google Sheet → Share → add the service account email as Editor.

### Sign-in with Google fails / redirect_uri_mismatch
**Cause:** The callback URL was not added to the OAuth app.
**Fix:** Add `https://tihems-three-wine.vercel.app/api/auth/callback/google` to Authorised redirect URIs in Google Cloud Console (Step 3).

### Sign in succeeds but shows "Access denied"
**Cause:** Your Google email is not in `ADMIN_EMAILS` and not in the AuthorizedUsers sheet.
**Fix:** Add your email to `ADMIN_EMAILS` in `.env.local` and restart the dev server.
