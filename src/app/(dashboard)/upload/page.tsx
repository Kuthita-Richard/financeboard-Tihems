import { getOrgSettings } from '@/lib/sheets'
import UploadClient from './UploadClient'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Import Data' }
export default async function UploadPage() {
  const settings = await getOrgSettings()
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>Import Transactions</h2>
        <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
          Upload an Excel or CSV file. Column names are matched flexibly — see the guide below.
        </p>
      </div>
      <UploadClient settings={settings} />
    </div>
  )
}
