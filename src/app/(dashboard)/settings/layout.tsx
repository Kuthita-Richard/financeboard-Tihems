/**
 * settings/layout.tsx — Settings section shell
 *
 * Renders the five-tab navigation bar across all settings pages.
 * Admin-only: enforced by proxy.ts middleware (no duplicate check here).
 *
 * The tab bar is a Client Component (SettingsTabs) so it can use
 * usePathname() to highlight the active tab without a full page reload.
 */
import type { Metadata } from 'next'
import SettingsTabs from './SettingsTabs'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
          Organisation Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
          Changes apply instantly across the app and all generated PDFs.
        </p>
      </div>

      <SettingsTabs />

      <div>{children}</div>
    </div>
  )
}
