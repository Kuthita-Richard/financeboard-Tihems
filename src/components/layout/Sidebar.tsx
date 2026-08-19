'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { LayoutDashboard, TrendingUp, FilePlus, Upload, FileText, Settings, ChevronRight, BarChart2, Sparkles, Target, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgSettings } from '@/types'
import Image from 'next/image'

interface NavChild { label: string; href: string }
interface NavItem  { label: string; href: string; icon: React.ElementType; roles?: string[]; children?: NavChild[] }

function buildNav(s: OrgSettings): NavItem[] {
  return [
    { label: 'Overview',     href: '/',                  icon: LayoutDashboard },
    {
      label: 'Analysis',     href: '/analysis/product',  icon: TrendingUp,
      children: [
        { label: s.productLabel,  href: '/analysis/product'  },
        { label: s.gatewayLabel,  href: '/analysis/gateway'  },
        { label: s.regionLabel,   href: '/analysis/region'   },
        { label: s.salesRepLabel, href: '/analysis/salesrep' },
        { label: s.customerLabel, href: '/analysis/customer' },
        { label: 'Monthly Trends',href: '/analysis/trends'   },
      ],
    },
    { label: 'AI Insights',  href: '/insights',          icon: Sparkles  },
    {
      label: 'Reports',      href: '/reports',           icon: FileText,
      children: [
        { label: 'Transaction Ledger',  href: '/reports/transactions' },
        { label: 'Performance Report',  href: '/reports/performance'  },
        { label: 'Variance Analysis',   href: '/reports/variance'     },
        { label: 'Year-to-Date',        href: '/reports/ytd'          },
        { label: 'Customer Report',     href: '/reports/customers'    },
        { label: 'Sales Rep Report',    href: '/reports/salesrep'     },
        { label: 'Gateway Reconciliation', href: '/reports/gateway'   },
        { label: 'Product Report',      href: '/reports/product'      },
        { label: 'Department Breakdown',href: '/reports/department-breakdown' },
        { label: 'Executive Summary',   href: '/reports/executive'    },
        { label: 'Audit Log',           href: '/reports/audit'        },
      ],
    },
    { label: 'Targets',      href: '/targets',           icon: Target,   roles: ['Admin'] },
    { label: 'Data Entry',   href: '/entry',             icon: FilePlus, roles: ['Admin','DataEntry'] },
    { label: 'Import Data',  href: '/upload',            icon: Upload,   roles: ['Admin','DataEntry'] },
    { label: 'Settings',     href: '/settings/identity', icon: Settings, roles: ['Admin'] },
  ]
}

interface Props {
  settings: OrgSettings
  onNavigate?: () => void
  /** Desktop-only icon-rail mode — separate from the mobile slide-in drawer, which always shows full width. */
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ settings, onNavigate, collapsed = false, onToggleCollapse }: Props) {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const role              = session?.user?.role ?? 'Viewer'
  const nav               = buildNav(settings)

  useEffect(() => { onNavigate?.() }, [pathname])  // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const canSee   = (item: NavItem) => !item.roles || item.roles.includes(role)
  const activeColor = '#7dd3fc'
  const mutedColor  = '#93c5fd'

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(nav.filter(i => i.children?.some(c => isActive(c.href))).map(i => i.label))
  )
  const toggleGroup = (label: string) => setOpenGroups(prev => {
    const next = new Set(prev)
    if (next.has(label)) next.delete(label); else next.add(label)
    return next
  })

  return (
    <aside className="flex flex-col h-full w-full"
      style={{ background: 'var(--sidebar)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Brand + collapse toggle */}
      <div className={cn('flex-shrink-0 flex items-center', collapsed ? 'flex-col gap-2 p-3' : 'justify-between p-5')}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" className={cn('flex items-center min-w-0', collapsed ? '' : 'gap-3')}>
          {settings.logoUrlLight
            ? <Image src={settings.logoUrlLight} alt={settings.orgName} width={34} height={34} className="rounded-lg object-contain flex-shrink-0" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(125,211,252,0.15)', border: '1px solid rgba(125,211,252,0.3)' }}>
                <BarChart2 size={18} color={activeColor} />
              </div>}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-white">{settings.orgName}</p>
              {settings.tagline && <p className="text-[10px] truncate mt-0.5" style={{ color: mutedColor, opacity: 0.65 }}>{settings.tagline}</p>}
            </div>
          )}
        </Link>
        {onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 hover:opacity-100 transition-opacity"
            style={{ color: mutedColor, opacity: 0.7, background: 'rgba(255,255,255,0.05)' }}>
            <Menu size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto space-y-0.5', collapsed ? 'p-2' : 'p-3')}>
        {nav.filter(canSee).map(item => {
          const active  = isActive(item.href)
          const Icon    = item.icon
          const hasKids = !!item.children

          if (hasKids) {
            const anyActive = item.children!.some(c => isActive(c.href))
            const isOpen    = openGroups.has(item.label)

            // Collapsed: no room for a nested list, so the icon becomes a
            // direct link to the group's default page instead of a
            // disclosure toggle. Full labels return the moment it expands.
            if (collapsed) {
              return (
                <Link key={item.href} href={item.href} title={item.label}
                  className="flex items-center justify-center px-2 py-2.5 rounded-lg"
                  style={{ color: anyActive ? activeColor : mutedColor, opacity: anyActive ? 1 : 0.75,
                    background: anyActive ? 'rgba(125,211,252,0.1)' : 'transparent' }}>
                  <Icon size={17} className="flex-shrink-0" />
                </Link>
              )
            }

            return (
              <div key={item.href}>
                <button type="button" onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm select-none hover:opacity-100"
                  style={{ color: anyActive ? activeColor : mutedColor, opacity: anyActive ? 1 : 0.75 }}>
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1 font-medium text-xs text-left">{item.label}</span>
                  <ChevronRight size={12} className={cn('flex-shrink-0 transition-transform', isOpen && 'rotate-90')} />
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.children!.map(child => {
                      const ca = isActive(child.href)
                      return (
                        <Link key={child.href} href={child.href}
                          className="flex items-center px-2 py-1.5 rounded-md text-[11px] transition-all"
                          style={{ color: ca ? activeColor : mutedColor, fontWeight: ca ? '600' : '400',
                            background: ca ? 'rgba(125,211,252,0.1)' : 'transparent', opacity: ca ? 1 : 0.75 }}>
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          if (collapsed) {
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className="flex items-center justify-center px-2 py-2.5 rounded-lg transition-all"
                style={{ color: active ? activeColor : mutedColor,
                  background: active ? 'rgba(125,211,252,0.1)' : 'transparent', opacity: active ? 1 : 0.8 }}>
                <Icon size={17} className="flex-shrink-0" />
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: active ? activeColor : mutedColor,
                background: active ? 'rgba(125,211,252,0.1)' : 'transparent',
                borderLeft: active ? `2px solid ${activeColor}` : '2px solid transparent',
                opacity: active ? 1 : 0.8 }}>
              <Icon size={15} className="flex-shrink-0" />{item.label}
            </Link>
          )
        })}
      </nav>

      {/* Manual + User */}
      <div className="flex-shrink-0">
        <div className={collapsed ? 'px-2 pb-1' : 'px-4 pb-1'}>
          <a href="/manual" target="_blank" rel="noopener noreferrer" title="User Manual"
            className={cn('flex items-center rounded-lg text-xs hover:opacity-80', collapsed ? 'justify-center py-2' : 'gap-2 px-3 py-2')}
            style={{ color: 'rgba(147,197,253,0.6)' }}>
            {collapsed ? '📖' : '📖 User Manual'}
          </a>
        </div>
        {session?.user && (
          <div className={collapsed ? 'p-2' : 'p-3'} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className={cn('flex items-center rounded-lg', collapsed ? 'justify-center py-2' : 'gap-2.5 px-2 py-2')}
              style={{ background: 'rgba(255,255,255,0.05)' }} title={collapsed ? `${session.user.name} · ${session.user.role}` : undefined}>
              {session.user.image
                ? <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full flex-shrink-0" />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ background: 'rgba(125,211,252,0.2)' }}>{session.user.name?.[0]?.toUpperCase() ?? '?'}</div>}
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-white">{session.user.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: mutedColor, opacity: 0.65 }}>{session.user.role}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <Link href="/about" onClick={onNavigate} title="Powered by Tihems"
          className="flex items-center justify-center gap-1.5 py-2.5 hover:opacity-100 transition-opacity"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Image src="/brand/tihems-icon.jpeg" alt="" width={12} height={12} className="rounded-sm opacity-60" />
          {!collapsed && <span className="text-[10px]" style={{ color: 'rgba(147,197,253,0.5)' }}>Powered by Tihems</span>}
        </Link>
      </div>
    </aside>
  )
}
