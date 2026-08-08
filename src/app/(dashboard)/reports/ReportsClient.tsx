'use client'

import Link from 'next/link'
import {
  Receipt, TrendingUp, BarChart3, CalendarRange,
  Users, UserCheck, CreditCard, Package, Briefcase, ShieldCheck, ArrowRight,
} from 'lucide-react'
import type { OrgSettings } from '@/types'

interface Props { settings: OrgSettings }

export default function ReportsClient({ settings }: Props) {
  const cards = [
    { href: '/reports/transactions', icon: Receipt,       title: 'Transaction Ledger',   desc: 'Every recorded transaction, filterable by period and dimension.' },
    { href: '/reports/performance',  icon: TrendingUp,    title: 'Performance Report',   desc: 'Target vs actual, annual and revised, across all dimensions.' },
    { href: '/reports/variance',     icon: BarChart3,     title: 'Variance Analysis',    desc: 'Where actuals diverge most from target, ranked by size.' },
    { href: '/reports/ytd',          icon: CalendarRange, title: 'Year-to-Date',         desc: 'Cumulative performance from January through the latest month.' },
    { href: '/reports/customers',    icon: Users,         title: `${settings.customerLabel} Report`, desc: `Counts and amounts collected per ${settings.customerLabel.toLowerCase()}.` },
    { href: '/reports/salesrep',     icon: UserCheck,      title: `${settings.salesRepLabel} Report`,  desc: `Performance broken down by ${settings.salesRepLabel.toLowerCase()}.` },
    { href: '/reports/gateway',      icon: CreditCard,    title: `${settings.gatewayLabel} Report`,   desc: `Collections and targets by ${settings.gatewayLabel.toLowerCase()}.` },
    { href: '/reports/product',      icon: Package,       title: `${settings.productLabel} Report`,   desc: `Performance by ${settings.productLabel.toLowerCase()}.` },
    { href: '/reports/executive',    icon: Briefcase,     title: 'Executive Summary',    desc: 'One-page, print-ready overview for leadership.' },
    { href: '/reports/audit',        icon: ShieldCheck,   title: 'Audit Trail',          desc: 'Who entered or edited what, and when.' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Reports</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          {settings.reportTitlePrefix || 'Choose a report to view, filter, and print or save as PDF.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}
            className="group rounded-xl border p-5 transition-colors hover:border-[var(--primary)]"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between">
              <div className="rounded-lg p-2" style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }}>
                <Icon size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--primary)' }} />
            </div>
            <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
