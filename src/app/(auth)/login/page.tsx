import { Suspense } from 'react'
import { BarChart2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import LoginForm from './LoginForm'
import { getOrgSettings } from '@/lib/sheets'

function LoginSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-pulse space-y-4">
        <div className="h-8 rounded-xl" style={{ background: '#dbeafe' }} />
        <div className="rounded-2xl border p-6 space-y-4" style={{ background: '#fff', borderColor: '#bfdbfe' }}>
          <div className="h-11 rounded-xl" style={{ background: '#dbeafe' }} />
          <div className="h-10 rounded-xl" style={{ background: '#dbeafe' }} />
          <div className="h-10 rounded-xl" style={{ background: '#dbeafe' }} />
          <div className="h-11 rounded-xl" style={{ background: '#dbeafe' }} />
        </div>
      </div>
    </div>
  )
}

export default async function LoginPage() {
  const settings = await getOrgSettings()
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f7ff' }}>
      {/* Nav */}
      <nav className="border-b px-6 py-3 flex items-center justify-between"
        style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
        <div className="flex items-center gap-2.5">
          {settings.logoUrlLight ? (
            <Image src={settings.logoUrlLight} alt={settings.orgName} width={28} height={28} className="rounded-lg object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#0c3460' }}>
              <BarChart2 size={14} color="#7dd3fc" />
            </div>
          )}
          <span className="font-bold text-sm" style={{ color: '#0c1a2e' }}>{settings.orgName || 'Tihems'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/manual" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70" style={{ color: '#4b6a8f' }}>
            User Manual
          </Link>
          <span style={{ color: '#bfdbfe' }}>·</span>
          <Link href="/login" className="ml-2 px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#0284c7', color: 'white' }}>
            Sign In
          </Link>
        </div>
      </nav>

      <div className="flex flex-1">
        {/* Left branding */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: '#0c3460' }}>
          <div className="flex items-center gap-3">
            {settings.logoUrlDark || settings.logoUrlLight ? (
              <Image src={settings.logoUrlDark || settings.logoUrlLight} alt={settings.orgName}
                width={40} height={40} className="rounded-xl object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(125,211,252,0.2)', border: '1px solid rgba(125,211,252,0.3)' }}>
                <BarChart2 size={22} color="#7dd3fc" />
              </div>
            )}
            <span className="text-white font-bold text-lg">{settings.orgName || 'Tihems'}</span>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              {settings.tagline || <>Performance intelligence,<br />crystal clear.</>}
            </h1>
            <p className="mt-4 text-base" style={{ color: '#93c5fd' }}>
              Real-time dashboards, 10 report types, AI insights, drill-through charts.
              Built on Google Sheets — no database required.
            </p>
            <div className="flex gap-3 mt-8 flex-wrap">
              {[
                { label: 'Transaction Ledger', color: '#7dd3fc' },
                { label: 'Performance Reports', color: '#86efac' },
                { label: 'AI Insights',         color: '#c4b5fd' },
                { label: '40 currencies',       color: '#fde68a' },
                { label: 'Drill-through',       color: '#f9a8d4' },
              ].map(p => (
                <span key={p.label} className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: p.color }}>{p.label}</span>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(147,197,253,0.4)' }}>
            <Image src="/brand/tihems-icon.jpeg" alt="" width={12} height={12} className="rounded-sm" />
            © {new Date().getFullYear()} Tihems · Performance Intelligence
          </p>
        </div>

        {/* Right form */}
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{ borderColor: '#bfdbfe', color: '#4b6a8f', background: '#ffffff' }}>
        <span className="flex items-center gap-1.5">
          <Image src="/brand/tihems-icon.jpeg" alt="" width={12} height={12} className="rounded-sm" />
          © {new Date().getFullYear()} Tihems · Performance Intelligence
        </span>
        <div className="flex items-center gap-4">
          <Link href="/manual" className="hover:underline">User Manual</Link>
        </div>
      </footer>
    </div>
  )
}
