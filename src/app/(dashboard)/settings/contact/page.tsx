import { getOrgSettings } from '@/lib/sheets'
import ContactSettings from './ContactSettings'
export default async function ContactPage() {
  const settings = await getOrgSettings()
  return <ContactSettings settings={settings} />
}
