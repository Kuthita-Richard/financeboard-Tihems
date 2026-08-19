import { getOrgSettings } from '@/lib/sheets'
import ReportsClient from './ReportsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports & PDF' }

export default async function ReportsPage() {
  const settings = await getOrgSettings()
  return <ReportsClient settings={settings} />
}
