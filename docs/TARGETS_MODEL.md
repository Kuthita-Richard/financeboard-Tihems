# Targets Model

How targets actually work now — what you enter, what gets computed, and
the one-time setup needed after deploying this.

---

## The core idea

**Payment Scheme is the ONLY dimension targets are entered against.** Every
other rollup — Overall, Hospital/Branch, Department, Sales Rep — is
*computed* by summing Payment Scheme targets. You never enter an Overall,
Hospital, Department, or Sales Rep target directly; there's nowhere to do
that anymore, by design, because manually keeping those in sync with the
underlying scheme targets was exactly the kind of thing that quietly
drifts out of true.

## What you actually enter

Only one target type exists now, and it requires a **Hospital/Branch**:

- **Payment Scheme** — e.g. "SHA MWALIMU MEDICAL COVER IP at Masinga = KSh 1.8M, June 2026." The same scheme at a different hospital is a separate, independent number.

## Carry-forward: you don't re-enter an unchanged target every month

A target holds for every subsequent month until a newer entry for that
same (Hospital, Payment Scheme) pair replaces it — **including across a
new year**. Set "SHA Scheme at Masinga = 50,000" once in March, and April,
May, June... keep using 50,000 automatically, with no new row needed,
until you enter a different amount for some later month.

This applies to **both** Annual Target and Revised Target together, and
to the **Active/Inactive** flag too — marking a target Inactive also
carries forward, so it stays excluded from calculations until either a
newer row reactivates it or a newer row replaces it outright.

**What this means for "All months" / full-year totals:** each month still
contributes its own copy to the sum, even if several consecutive months
share the same carried-forward source row — the same way an unchanged
$10k/month target genuinely sums to $120k across a year. This isn't
double-counting; it's the correct total for "the same target, twelve
months running."

**A period before a series' very first row is zero** — carry-forward only
looks backward from wherever you first set a target for that (Hospital,
Payment Scheme) pair; it never invents a target for time before that.

## What gets computed

| Shown as | Computed as |
|---|---|
| **Overall** (top KPI cards) | Sum of every Payment Scheme target, across every hospital |
| **By Hospital** | Sum of that hospital's own Payment Scheme targets |
| **By Payment Scheme** | Sum of that scheme's target across whichever hospital(s) are in view |
| **By Department** | Sum of every Payment Scheme target whose scheme is classified under that department (see below) |
| **By Sales Rep** | Sum of every Payment Scheme target whose scheme is classified under that rep (see below) |

If you filter Overview to one hospital, every rollup narrows to just that
hospital's numbers — nothing here uses the raw grand total once a filter
is applied.

## Payment Scheme → Department / Sales Rep: auto-detected, override when needed

A scheme's department **and** its sales rep are each **inferred
automatically** from your actual transaction history — whichever
department/rep it's most often been recorded under wins. No setup
required for schemes you're already using. The two classifications are
completely independent of each other — overriding one has no effect on
the other.

Two situations where you'd want a manual override, at **Settings →
Classifications**:
- **A brand-new scheme** with a target set ahead of time but zero
  transactions yet — there's nothing to infer from, so it shows
  "Unclassified" until you either record a transaction or set an override.
- **A wrong auto-detection** — if a scheme's been recorded under the wrong
  department or rep by mistake often enough to skew the inference.

A manual override always takes permanent precedence over the auto-detected
value, and can be cleared at any time to fall back to auto-detection.

## One-time setup after deploying this

This adds two new sheet tabs (`SchemeDepartmentMap` and
`SchemeSalesRepMap`) that don't exist in your spreadsheet yet. **Visit
`/api/init` once while logged in as Admin** — it creates any missing tabs
safely (skips ones that already exist). Skipping this step means the
first attempt to save a manual override on the Classifications screen
will fail.

## Migrating existing targets

Any target row that predates this change (created before the Region field
existed) has a blank Hospital/Branch — it won't count toward any roll-up
until you assign it. Open it from the Targets table and pick the correct
hospital; there's no bulk migration for this since only you know which
hospital each old row was actually meant for.

Any pre-existing Sales Rep–type target row (from before Sales Rep became
a computed roll-up) is now legacy data — it's no longer read by any
computation, since Sales Rep figures are now always derived from Payment
Scheme targets instead. Legacy rows can still be viewed and deleted from
the Targets table, but their type can't be changed and no new Sales Rep
rows can be created.
