import { getMetadata, getOrgSettings } from '@/lib/sheets'
import DataListsSettings from './DataListsSettings'

export default async function DataListsPage() {
  const [metadata, settings] = await Promise.all([getMetadata(), getOrgSettings()])
  return <DataListsSettings metadata={metadata} settings={settings} />
}
