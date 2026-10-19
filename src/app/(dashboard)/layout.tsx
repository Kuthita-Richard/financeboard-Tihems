import { auth }         from '@/lib/auth'
import { getOrgSettings } from '@/lib/sheets'
import DashboardShell  from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getOrgSettings()])
  return (
    <DashboardShell settings={settings} title={settings.orgName}
      subtitle={`${settings.tagline}${session?.user?.role ? ` · ${session.user.role}` : ''}`}>
      {children}
    </DashboardShell>
  )
}
