'use client'

/**
 * SettingsTabs.tsx
 *
 * Client component purely because it needs usePathname() to highlight
 * whichever tab the user is currently on. No data fetching here.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Identity',   href: '/settings/identity'   },
  { label: 'Contact',    href: '/settings/contact'    },
  { label: 'Branding',   href: '/settings/branding'   },
  { label: 'Data Lists', href: '/settings/data-lists' },
  { label: 'Classifications', href: '/settings/scheme-mapping' },
  { label: 'Reports',    href: '/settings/reports'    },
  { label: 'App Config', href: '/settings/app-config' },
  { label: 'About Tihems', href: '/settings/company-page' },
]

export default function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div
      className="flex gap-1 p-1 rounded-xl border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {TABS.map(tab => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 text-center py-2 px-3 rounded-lg text-xs font-medium transition-all'
            )}
            style={{
              background:  isActive ? 'var(--primary)'    : 'transparent',
              color:       isActive ? 'white'              : 'var(--muted-fg)',
              fontWeight:  isActive ? '600'                : '400',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
