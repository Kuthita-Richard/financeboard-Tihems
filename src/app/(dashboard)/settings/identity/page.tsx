import { getOrgSettings } from '@/lib/sheets'
import IdentitySettings from './IdentitySettings'

export default async function IdentityPage() {
  const settings = await getOrgSettings()
  return <IdentitySettings settings={settings} />
}
