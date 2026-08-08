# Deployment Guide

How to deploy Tihems to Vercel and connect a custom domain.

---

## Deploy to Vercel

### Option A — Vercel CLI (recommended)

```bash
# Install Vercel CLI globally
npm i -g vercel

# From the project root
vercel

# Follow the prompts:
# - Link to your Vercel account
# - Create a new project
# - Use detected settings (Next.js)
```

Your app will be live at `https://your-project.vercel.app`.

### Option B — GitHub Integration

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repository
4. Vercel auto-detects Next.js — click Deploy

---

## Set Environment Variables on Vercel

After deploying, add your environment variables in the Vercel dashboard:

1. Go to your project → **Settings → Environment Variables**
2. Add each variable from your `.env.local`:

| Variable | Environment |
|---|---|
| `AUTH_SECRET` | Production, Preview, Development |
| `AUTH_GOOGLE_ID` | Production, Preview, Development |
| `AUTH_GOOGLE_SECRET` | Production, Preview, Development |
| `AUTH_URL` | Production only (set to your production URL) |
| `SHARED_ACCESS_PASSWORD` | Production, Preview |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Production, Preview, Development |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Production, Preview, Development |
| `GOOGLE_SPREADSHEET_ID` | Production, Preview, Development |
| `ADMIN_EMAILS` | Production, Preview, Development |

> `BLOB_READ_WRITE_TOKEN` is set automatically when you create a Blob store in the Vercel dashboard.

### Important: AUTH_URL in Production

Set `AUTH_URL` to your production URL exactly:
```
AUTH_URL=https://your-project.vercel.app
```
Or your custom domain if you have one:
```
AUTH_URL=https://dashboard.yourcompany.com
```

---

## Update Google OAuth Redirect URIs

After deployment, add your production URL to the Google OAuth app:

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Click your OAuth client → Edit
3. Under **Authorised redirect URIs**, add:
   ```
   https://your-project.vercel.app/api/auth/callback/google
   ```
4. If using a custom domain, also add:
   ```
   https://your-custom-domain.com/api/auth/callback/google
   ```
5. Save

---

## Create a Vercel Blob Store

Required for logo and favicon uploads.

1. Vercel dashboard → your project → **Storage**
2. Click **Create Database → Blob**
3. Give it any name → Create
4. The `BLOB_READ_WRITE_TOKEN` is automatically added to your project's environment variables

---

## Connect a Custom Domain

1. Vercel dashboard → your project → **Settings → Domains**
2. Enter your domain (e.g. `dashboard.yourcompany.com`)
3. Vercel provides DNS records to add:
   - For a subdomain: add a `CNAME` record pointing to `cname.vercel-dns.com`
   - For a root domain: add an `A` record pointing to `76.76.21.21`
4. Add these in your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
5. DNS propagation takes 5–60 minutes
6. Vercel auto-provisions an SSL certificate via Let's Encrypt

### Namecheap Specifically

1. Log in to Namecheap → Domain List → Manage your domain
2. Advanced DNS tab
3. Add Host Record:
   - Type: `CNAME`
   - Host: `dashboard` (for dashboard.yourcompany.com)
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic

---

## Moving from Vercel to Self-Hosted (Namecheap, VPS, etc.)

When you're ready to move off Vercel to your own server:

### Option A — Node.js server (e.g. DigitalOcean, Hetzner)

```bash
npm run build        # builds the .next directory
npm run start        # starts the production Node.js server on port 3000
```

Use nginx as a reverse proxy in front of port 3000. Set `PORT` env var if needed.

### Option B — Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

### Replacing Vercel Blob

If you leave Vercel, replace `@vercel/blob` with an S3-compatible store.
The only file that needs changing is `src/actions/index.ts` —
specifically the `uploadLogoAction` function. Replace `put()` from
`@vercel/blob` with the equivalent from `@aws-sdk/client-s3` or
any S3-compatible API (Cloudflare R2, Backblaze B2, MinIO).

```typescript
// Current (Vercel Blob)
import { put } from '@vercel/blob'
const blob = await put(filename, file, { access: 'public' })
const url  = blob.url

// Replacement (AWS S3 / R2 / etc.)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
const s3  = new S3Client({ region: 'auto', endpoint: process.env.S3_ENDPOINT })
await s3.send(new PutObjectCommand({ Bucket: 'your-bucket', Key: filename, Body: buffer, ACL: 'public-read' }))
const url = `https://your-bucket.s3.amazonaws.com/${filename}`
```

---

## Post-Deployment Checklist

- [ ] App loads at production URL
- [ ] Google sign-in works (no redirect_uri_mismatch error)
- [ ] `AUTH_URL` is set to the production URL
- [ ] `BLOB_READ_WRITE_TOKEN` is configured (logo upload works)
- [ ] Google Sheets service account has Editor access to the spreadsheet
- [ ] Custom domain is resolving and SSL is active
- [ ] Added production callback URL to Google OAuth app
