# User Guide

How to use Tihems as a day-to-day reporting tool.
No technical knowledge required.

---

## Signing In

Open the app URL in your browser. You will see the sign-in page.

**With your Google account (recommended)**
Click **Continue with Google** and choose your work Google account.
If you see "Access denied", contact your administrator — your email needs
to be added to the authorised users list.

**With the shared password**
Type your full name in the first box and the shared access password in the
second box. Click **Sign In**. Your name will appear on every record you create,
so use your real name.

---

## Your Role

Your role is shown in the sidebar next to your name.

| Role | What you can do |
|---|---|
| **Admin** | Everything — including settings and managing other users |
| **DataEntry** | Enter data, upload files, view dashboard and reports |
| **Viewer** | View the dashboard and download reports only |

---

## Dashboard (Overview)

The main page shows your organisation's sales performance at a glance.

### Filters
Seven dropdowns at the top let you narrow the view:
- **Year** / **Month** — filter by time period
- **Region** (or your organisation's equivalent) — show one area only
- **Product / Service** — focus on one category
- **Sales Rep** — see one person's performance
- **Status** — Active or Inactive records
- **Performance** — filter by flag (Exceeding, On Track, At Risk, Below Target)

Changing any filter updates all charts and KPI cards instantly.
Click **Reset** to clear all filters and return to the full view.

### KPI Cards
Five summary numbers across the top:
- **Target Amount** — the total that was set as the goal
- **Actual Amount** — what was actually achieved
- **Targets Met** — how many individual records met or exceeded their target
- **Variance** — the difference (Actual minus Target). Green = above target, red = below
- **Achievement %** — Actual ÷ Target × 100

### Charts
- **Target Met %** — the gauge shows overall achievement as a percentage
- **Variance % by Product/Service** — which categories are above or below target
- **Target Met % by Region** — which regions performed best
- **Actual vs Target by Region** — side-by-side comparison per region

### Performance Flags
Every record is automatically classified into one of four categories:

| Flag | Meaning |
|---|---|
| 🟢 Exceeding | Achievement is at or above 100% of target |
| 🔵 On Track | Achievement is between 90% and 99% |
| 🟡 At Risk | Achievement is between 75% and 89% |
| 🔴 Below Target | Achievement is below 75% |

The exact thresholds can be changed by an Admin in Settings → App Config.

---

## Entering Data Manually

Go to **Data Entry** in the left sidebar.

Fill in each field:
1. **Date** — the date this record applies to (not today's date necessarily)
2. **Status** — Active or Inactive
3. **Region** (or your equivalent) — select from the dropdown
4. **Product / Service** — select from the dropdown
5. **Sales Rep** — select from the dropdown
6. **Target Amount** — what the goal was for this record
7. **Actual Amount** — what was actually achieved
8. **Notes** — optional context (may be required depending on your settings)

As you type the Target and Actual amounts, a **live preview** appears above
showing the Variance, Achievement %, and Performance Flag — so you can verify
before saving.

Click **Save Record**. A confirmation appears with the record ID.
Click **Reset** to clear the form and enter another record.

---

## Importing from Excel or CSV

Go to **Import Excel** in the left sidebar.

### Preparing your file
Your file can have columns in any order. The importer recognises flexible
column names — see the table on the Import page for all accepted alternatives.

The minimum required columns are:
- Date
- Region (or branch/territory/zone)
- Product/Service (or category/department/item)
- Sales Rep (or rep/officer/agent/name)
- Target Amount (or target/goal)
- Actual Amount (or actual/sales/achieved)

Other columns (Status, Notes) are optional and default to Active/blank if missing.

### Importing
1. Drag your file onto the drop zone, or click to browse
2. Click **Import Records**
3. A summary shows how many records were imported and any rows that failed
4. Failed rows are listed with a reason so you can fix and re-import them

### Downloading a template
Click **Template** (top right of the Import page) to download a sample CSV
showing the exact column names and format expected.

---

## Analysis Pages

Four analysis pages are available in the sidebar under **Analysis**:

**Region Analysis**
Table and chart of all regions ranked by achievement. Shows actual vs target,
variance, and performance flag per region.

**Product/Service Analysis**
Variance percentage per category. Quickly shows which products or services
are outperforming or underperforming their targets.

**Sales Rep Analysis**
Ranked leaderboard of all sales reps by achievement percentage.
Also shows hit rate (what percentage of their records met target).

**Monthly Trends**
Bar chart of actual vs target per month, with an achievement % trend line.
Table below shows the same data in numbers.

---

## Generating Reports

Go to **Reports & PDF** in the left sidebar.

1. Use the dropdowns to filter the report by Year, Month, and/or Region
2. Review the KPI summary and the detailed records table
3. Click **Print / Save PDF** — your browser's print dialog opens
4. In the print dialog:
   - Change **Destination** to **Save as PDF**
   - Set **Layout** to Landscape for better table readability
   - Click **Save**

The PDF includes your organisation's name, contact details, and footer text
as configured in Settings.

---

## Settings (Admins only)

The Settings page has five tabs. Changes take effect immediately across the
entire app — no restart or rebuild needed.

### Identity
Set your organisation name, tagline, and upload your logo and favicon.
The logo appears in the sidebar and on every PDF report.
Upload formats: PNG, JPG, SVG, WEBP (max 2MB each).

### Contact
Email address, phone number, and physical address. These appear in the
footer of every PDF report.

### Branding
Choose your brand colours using the colour picker or by typing a hex code.
Select your preferred font and default mode (dark/light).
The **Live Preview** panel on the right updates as you make changes so you
can see the effect before saving.

### Reports
Control what appears on PDF reports:
- Report title prefix and "Prepared by" line
- Currency and date format
- Footer/confidentiality text
- Watermark (diagonal text on every page)
- Whether to show the "Recorded By" column

### App Config
- Change the labels for Region, Product/Service, and Sales Rep to match
  your organisation's terminology (e.g. "Branch", "Service", "Officer")
- Adjust performance flag thresholds
- Set the default dashboard period
- Manage authorised users — add users by email and assign their role

---

## Adding New Users (Admins)

Go to **Settings → App Config**, scroll to **Authorised Users**.

1. Click **Add User**
2. Enter the user's Google email address
3. Choose their role (Viewer, DataEntry, or Admin)
4. Click **Add**

The user can now sign in with **Continue with Google** using that email.
If they try to sign in before being added, they will see "Access denied".

---

## Common Questions

**Can two people enter data at the same time?**
Yes. Each record is independent. There is no locking or conflict.

**Can I edit a record after saving it?**
Only if an Admin has enabled "Allow Data Editing" in Settings → App Config.

**Where is the data actually stored?**
In Google Sheets — the same spreadsheet your administrator linked during setup.
You can view it directly in Google Sheets if you have been given access.

**I uploaded an Excel file and some rows failed. What do I do?**
The import page lists each failed row with a reason. Fix those rows in your
Excel file and re-import — only the failed rows need to be in the new file.

**The dashboard is showing old data.**
Try refreshing the page. The dashboard fetches live data from Google Sheets
on every load. If the data in the sheet is recent, it will appear within seconds.

**I cannot see the Settings page.**
Settings is only available to Admins. Contact your administrator if you need
access changed.
