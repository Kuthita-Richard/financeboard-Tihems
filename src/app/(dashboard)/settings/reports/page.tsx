import { getOrgSettings } from '@/lib/sheets'
import ReportSettings from './ReportSettings'
export default async function ReportSettingsPage() {
  const settings = await getOrgSettings()
  return <ReportSettings settings={settings} />
}
