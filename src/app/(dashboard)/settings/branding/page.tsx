import { getOrgSettings } from '@/lib/sheets'
import BrandingSettings from './BrandingSettings'
export default async function BrandingPage() {
  const settings = await getOrgSettings()
  return <BrandingSettings settings={settings} />
}
