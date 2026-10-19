import { getOrgSettings, getAuthorizedUsers } from '@/lib/sheets'
import AppConfigSettings from './AppConfigSettings'
export default async function AppConfigPage() {
  const [settings, users] = await Promise.all([getOrgSettings(), getAuthorizedUsers()])
  return <AppConfigSettings settings={settings} users={users} />
}
