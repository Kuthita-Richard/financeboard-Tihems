# Troubleshooting

Real problems this project actually hit, how they were diagnosed, and how they were fixed. Read error messages literally before theorizing — most of these were solved by taking the exact wording seriously rather than guessing.

## Deployment (Vercel)

### "No Next.js version detected" / framework shows as "Other"
Vercel reads `package.json` from whatever **Root Directory** is configured, not necessarily the repo root. If your zip/export has an extra wrapper folder (e.g. `tihems/package.json` instead of `package.json` at the root), Vercel will fail to detect the framework entirely.

**Fix:** either set Root Directory to the actual subfolder, or restructure the repo so `package.json` sits at the root. `vercel.json` with `{"framework": "nextjs"}` also helps pin this explicitly.

### Google login redirects to `localhost` after deploying
An explicit `AUTH_URL` (or the old `NEXTAUTH_URL`) environment variable always overrides Auth.js's automatic host detection — even on Vercel, where it would otherwise auto-detect correctly.

**Fix:**
1. In Vercel → Project Settings → Environment Variables, set `AUTH_URL` to your actual deployed domain, not `localhost`, scoped to Production.
2. Delete any leftover `NEXTAUTH_URL` — mixing the old v4 name with v5's `AUTH_URL` causes exactly this conflict.
3. In Google Cloud Console → Credentials → your OAuth client, confirm the Authorized redirect URI includes `https://<your-domain>/api/auth/callback/google`.
4. `trustHost: true` is already set in `src/lib/auth.ts` as a defensive backstop, but it does not override an explicit wrong `AUTH_URL`.

### A deployed URL shows Vercel's own login page instead of the app
That's Vercel's **Deployment Protection**, which gates preview/branch URLs (the `-git-main-` style ones) behind a Vercel account login. It blocks everyone without Vercel access to that project — including external tools trying to check the live site. Disable it in Project Settings if you need the URL reachable by others, or use a production domain instead.

## Google Sheets

### "The caller does not have permission"
This is Google's own API error, not something this app's code produces — it means the service account can **read** the spreadsheet but not **write** to it.

**Fix:** open the actual Google Sheet → Share → add the service account's `client_email` (from your credentials) as **Editor**, not Viewer.

### "Unable to parse range: Metadata!B:B" (or any `SheetName!A:A`-style error)
The named tab doesn't exist in that spreadsheet yet. This app expects six specific tabs: `Transactions`, `Targets`, `Metadata`, `Settings`, `AuditLog`, `AuthorizedUsers`.

**Fix:** while logged in as an Admin, visit `/api/init` on your deployed app. It creates any missing tabs and seeds headers (plus a few sample rows in Metadata) without touching any other existing sheet/tab.

### Dropdowns (Product, Gateway, Region, Sales Rep) show nothing / feel "unclickable"
These are populated from the `Metadata` sheet, which starts empty. An empty native `<select>` opens showing only its placeholder — which looks broken but technically isn't.

**Fix:** Settings → Data Lists → add at least one value to each list before expecting Entry/Upload/Targets dropdowns to work.

## Caching (Next.js)

### A save/add succeeds, but the change doesn't show up anywhere for a while
There are **two separate caching layers** in this app, and clearing one does not clear the other:
- `revalidatePath(path)` clears Next.js's route cache for that specific page.
- `unstable_cache(...)` (used by every `get*` function in `src/lib/sheets.ts`) has its own independent cache, keyed by `tags`, with its own TTL (5 min for transactions, 10 for targets, 30 for metadata, 60 for org settings and users). `revalidatePath` does **not** clear this.

If a write action only calls `revalidatePath` and never invalidates the matching tag, the underlying data function keeps returning its old cached result until the TTL naturally expires — even though the page technically re-rendered. This is exactly what caused Data Lists entries to save successfully while Entry/Upload/Targets dropdowns kept showing empty, and why Branding/Identity/Contact saves could take up to an hour to actually appear.

**Fix:** every write action must call the matching invalidation alongside `revalidatePath`. As of Next.js 16, use **`updateTag(tag)`** (not `revalidateTag`, which now requires a second "profile" argument and is meant for broader, cross-user invalidation) — `updateTag` is purpose-built for Server Actions and gives the person who just wrote data an immediate, fresh read of their own change:

```ts
import { updateTag } from 'next/cache'
// ...after the write:
updateTag('metadata')       // matches the tag in unstable_cache(..., { tags: ['metadata'] })
revalidatePath('/entry', 'page')
```

The five tags in this app: `transactions`, `targets`, `metadata`, `org-settings`, `auth-users` — each must be invalidated by every action that writes to it.

## Dependencies

### `npm audit` shows vulnerabilities with "No fix available"
Sometimes true, sometimes just means no fix was published **to npm** specifically — check the package's own site/CDN. SheetJS (`xlsx`) is the textbook example: they stopped publishing security patches to npm and only publish to `cdn.sheetjs.com` now. Point the dependency at the CDN tarball URL directly in `package.json` instead of a normal semver range.

### `npm audit fix --force` suggests downgrading a package
Don't follow it blindly — npm's resolver sometimes proposes the oldest version technically outside a vulnerable range, which can be a major, breaking downgrade. Read exactly what it's proposing before running it.

### A vulnerability's suggested fix breaks something else
Try the fix in isolation and actually re-run your full lint/build before committing to it. `eslint@10` fixes the `brace-expansion` chain but breaks linting entirely right now, because `eslint-config-next` isn't compatible with ESLint 10's changed internal rule API yet. Left on `eslint@9` deliberately — this only affects dev tooling, never ships to the deployed app.

## Common React bugs in this codebase's history

### A form field or interactive element stops working after some other state changes nearby
Check whether the component (`Field`, `ColorField`, an `ImageUploader`, etc.) is defined **inside** another component's function body instead of at module scope. React recreates it fresh on every re-render, which can destroy and rebuild the underlying DOM node mid-interaction — this is exactly what made the Branding page's color pickers close instantly on click, since `watch()` re-renders on every field change. ESLint's `react-hooks/static-components` rule catches this — it is not a style nitpick, it's frequently a real functional bug.

### `<button onClick={...}>` inside a page that has no `'use client'`
Server Components can't take event handlers. This compiles fine and even passes `next build` if the route is dynamic (build doesn't execute dynamic routes), so it can ship silently broken. Extract the interactive part into its own small Client Component instead of adding `'use client'` to the whole page if the rest of it needs to stay server-rendered.

### A sidebar/dropdown chevron rotates but nothing actually expands or collapses
Check whether there's an actual click handler and open/closed state at all — a chevron can be wired purely to `pathname` (rotating only when a child route is active) with no real toggle behind it.

## General debugging approach that works

Go to the actual source of truth instead of reasoning about symptoms: clone the real repo, run the real build, read the exact error string verbatim, search it if it looks like a vendor's own wording rather than app-specific text. Nearly everything on this list was solved this way, not by guessing from what the symptom looked like.
