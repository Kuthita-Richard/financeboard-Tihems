# Printing reports

Reports are printed straight from the browser (Print / Save PDF). Two things
here were measured against a real headless Chrome print engine rather than
assumed — worth knowing before touching any of it.

## 1. The app shell used to clip every printed report to ONE page

`DashboardShell` is a fixed-height, internally-scrolling layout (`h-screen` +
`overflow-y-auto`). Correct on screen; in print it cuts everything past the
first viewport-height. A 150-row report printed as a single page showing ~25
rows. The `.app-shell / .app-content / .app-main / .app-sidebar` classes and
the `@media print` block in `globals.css` let it paginate, and hide the
sidebar and top bar.

## 2. Repeating the logo header on every page: use `<thead>`, not `position: fixed`

Every report is wrapped in `<ReportFrame>` (`components/ui/ReportHeader.tsx`):
a one-column table whose `<thead>` is the header and whose `<tbody>` is the
report. Browsers repeat a `<thead>` on every printed page, including the last.

Tried and rejected — a `position: fixed` header placed in a reserved top
page-margin. In Chrome:

| Approach                                  | Result                                           |
|-------------------------------------------|--------------------------------------------------|
| `top: 0`                                  | Repeats on all pages, but overlaps the content   |
| negative `top`, `transform`, negative margin | Relocated to the page **bottom**; **missing from the last page** |

So the margin can't be used for fixed elements. If you add a new report page,
wrap its content in `<ReportFrame settings={settings} title="…">` — don't
render the header as a plain element, or it will only appear on page 1.

Layout: primary logo top-centre with org name + report title beneath; the
secondary/tertiary logos flank that block (1.5× their old size, pulled toward
the centre). A secondary logo set to "Upper Center" sits beside the primary.
