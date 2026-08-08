import Link from 'next/link'
import {
  ArrowLeft, BarChart2, LayoutDashboard, TrendingUp, Sparkles, FileText,
  Target, FilePlus, Upload, Settings, Maximize2,
} from 'lucide-react'
import { getOrgSettings } from '@/lib/sheets'

export const metadata = { title: 'User Manual' }

const NAV = [
  { id: 'overview',   label: 'Overview' },
  { id: 'analysis',   label: 'Analysis' },
  { id: 'insights',   label: 'AI Insights' },
  { id: 'reports',    label: 'Reports' },
  { id: 'targets',    label: 'Targets' },
  { id: 'entry',      label: 'Data Entry' },
  { id: 'upload',     label: 'Import Data' },
  { id: 'settings',   label: 'Settings' },
  { id: 'roles',      label: 'Roles & Access' },
  { id: 'tips',       label: 'Tips' },
]

function Section({ id, icon: Icon, title, children }: {
  id: string; icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border p-6" style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e0f2fe' }}>
          <Icon size={17} style={{ color: '#0284c7' }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: '#0c1a2e' }}>{title}</h2>
      </div>
      <div className="text-sm leading-relaxed space-y-2.5" style={{ color: '#334155' }}>{children}</div>
    </section>
  )
}

export default async function ManualPage() {
  const settings = await getOrgSettings()

  return (
    <div className="min-h-screen" style={{ background: '#f0f7ff' }}>
      <nav className="border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
        <div className="flex items-center gap-2.5">
          {settings.logoUrlLight ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrlLight} alt={settings.orgName} style={{ height: 28, width: 'auto' }} />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#0c3460' }}>
              <BarChart2 size={14} color="#7dd3fc" />
            </div>
          )}
          <span className="font-bold text-sm" style={{ color: '#0c1a2e' }}>{settings.orgName || 'Tihems'}</span>
        </div>
        <Link href="/login" className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70" style={{ color: '#4b6a8f' }}>
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[220px_1fr] gap-8">
        {/* Sticky table of contents, styled like the real sidebar's nav list */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl p-4 space-y-0.5" style={{ background: '#0c3460' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider px-3 pb-2" style={{ color: 'rgba(147,197,253,0.6)' }}>
              On this page
            </p>
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`}
                className="block px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-100"
                style={{ color: '#93c5fd', opacity: 0.8 }}>
                {n.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0c1a2e' }}>User Manual</h1>
            <p className="text-sm mt-1" style={{ color: '#4b6a8f' }}>
              Everything in {settings.orgName || 'this dashboard'}&apos;s sidebar, explained — what it&apos;s for and when to use it.
            </p>
          </div>

          <Section id="overview" icon={LayoutDashboard} title="Overview">
            <p>The landing page after sign-in. Pick a Year and Month, then read the KPI cards: Amount Collected, Annual Plan, Revised Target, achievement vs Revised, achievement vs Annual Plan, and {settings.customerLabel} count against its target.</p>
            <p><strong>Use it for:</strong> a fast daily or weekly check on where the business stands right now, before drilling into any one dimension.</p>
          </Section>

          <Section id="analysis" icon={TrendingUp} title="Analysis">
            <p>Six breakdowns of performance, each filterable by year and month:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>{settings.productLabel}</strong> — performance by product/service line.</li>
              <li><strong>{settings.gatewayLabel}</strong> — performance by how customers paid.</li>
              <li><strong>{settings.regionLabel}</strong> — performance by geography.</li>
              <li><strong>{settings.salesRepLabel}</strong> — performance by team member.</li>
              <li><strong>{settings.customerLabel}</strong> — performance by account.</li>
              <li><strong>Monthly Trends</strong> — month-by-month movement across the whole year, for one chosen dimension.</li>
            </ul>
            <p><strong>Use it for:</strong> finding out <em>which</em> dimension is actually driving a good or bad month, not just that it happened.</p>
          </Section>

          <Section id="insights" icon={Sparkles} title="AI Insights">
            <p>Pick a year and month, click Generate Insights, and get a short written summary of what&apos;s driving performance in that period — which dimensions are exceeding or missing target, and one actionable recommendation — instead of reading every chart yourself.</p>
            <p><strong>Use it for:</strong> a quick narrative read on a period before a meeting, when you don&apos;t have time to dig through Analysis yourself. It&apos;s generated fresh each time you click Generate, so re-run it if the underlying data has changed.</p>
          </Section>

          <Section id="reports" icon={FileText} title="Reports">
            <p>Ten print-ready, PDF-exportable reports, each suited to a different audience or question:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Transaction Ledger</strong> — every recorded transaction, filterable. Use for a raw audit of what was entered.</li>
              <li><strong>Performance Report</strong> — Annual and Revised targets vs. actual, across every dimension in one document.</li>
              <li><strong>Variance Analysis</strong> — ranks dimensions by how far actuals diverge from target. Use to spot the biggest problem areas first.</li>
              <li><strong>Year-to-Date</strong> — cumulative performance from January through the latest month.</li>
              <li><strong>{settings.customerLabel} Report</strong>, <strong>{settings.salesRepLabel} Report</strong>, <strong>Gateway Reconciliation</strong>, <strong>{settings.productLabel} Report</strong> — single-dimension deep dives.</li>
              <li><strong>Executive Summary</strong> — a one-page overview built for leadership, not line-level detail.</li>
              <li><strong>Audit Log</strong> — who entered or edited what, and when. Use this to trace a discrepancy back to its source.</li>
            </ul>
            <p>Every report shows your logo(s) and org name in the header, and has a Print / Save PDF button.</p>
          </Section>

          <Section id="targets" icon={Target} title="Targets">
            <p>Set an <strong>Annual Target</strong> for the year, and — if plans change partway through — a <strong>Revised Target</strong> for any specific month. Every month needs its own target row; targets don&apos;t automatically carry over from the previous month.</p>
            <p><strong>Use it for:</strong> this is what every performance comparison in the app is measured against — set it before entering transactions, or Analysis and Reports will show everything as unmeasurable.</p>
          </Section>

          <Section id="entry" icon={FilePlus} title="Data Entry">
            <p>Add a single transaction: date, status, {settings.customerLabel.toLowerCase()} name, {settings.productLabel.toLowerCase()}, {settings.gatewayLabel.toLowerCase()}, {settings.regionLabel.toLowerCase()}, {settings.salesRepLabel.toLowerCase()}, amount paid, and an optional note.</p>
            <p><strong>Before this will work:</strong> the {settings.productLabel}, {settings.gatewayLabel}, {settings.regionLabel}, and {settings.salesRepLabel} dropdowns are empty until an Admin adds values under <strong>Settings → Data Lists</strong>. If those dropdowns look unusable, that&apos;s why — go add values there first.</p>
            <p><strong>Use it for:</strong> one-off entries as they happen. For many records at once, use Import Data instead.</p>
          </Section>

          <Section id="upload" icon={Upload} title="Import Data">
            <p>Upload a spreadsheet of transactions in bulk rather than typing them in one at a time.</p>
            <p><strong>Use it for:</strong> backfilling historical data, or importing a batch collected outside the app.</p>
          </Section>

          <Section id="settings" icon={Settings} title="Settings">
            <p>Admin-only. Six tabs:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity</strong> — org name, tagline, website, and up to three logos (a main logo plus two optional co-branding logos, positioned left/right/upper-center on report headers), and a favicon.</li>
              <li><strong>Contact</strong> — primary/support email, phone, address, and social links, shown on printed reports.</li>
              <li><strong>Branding</strong> — colors, accent color, and font used throughout the app.</li>
              <li><strong>Data Lists</strong> — add the values that populate the dropdowns on Data Entry, Import Data, and Targets. Start here before anyone tries to enter data.</li>
              <li><strong>Reports</strong> — report title prefix, default &ldquo;prepared by&rdquo; name, footer text, currency format, date format, fiscal year start, and an optional watermark.</li>
              <li><strong>App Config</strong> — rename any dimension label to your team&apos;s own terminology, set performance thresholds (Exceeding/On Track/At Risk/Below Target), and manage who has access.</li>
            </ul>
          </Section>

          <Section id="roles" icon={BarChart2} title="Roles & Access">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Admin</strong> — full access, including Settings and adding/removing team members.</li>
              <li><strong>Data Entry</strong> — can add transactions and targets, and upload spreadsheets, but can&apos;t change Settings. Anyone signing in with the shared password gets this role.</li>
              <li><strong>Viewer</strong> — can view Overview, Analysis, and Reports, but can&apos;t add or edit data or change settings.</li>
            </ul>
            <p>Sign in with your Google account, or the shared team password and your name if Google sign-in isn&apos;t available to you. Every entry is tied to whichever name or account you sign in with — this is what powers the Audit Log.</p>
          </Section>

          <Section id="tips" icon={Maximize2} title="Tips">
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the fullscreen button in the top bar for a distraction-free view on shared screens or projectors.</li>
              <li>Report pages print cleanly — navigation and buttons are automatically hidden when you print.</li>
              <li>Renaming a dimension label in App Config updates it everywhere at once — Data Entry, Analysis, Reports, and this manual.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
