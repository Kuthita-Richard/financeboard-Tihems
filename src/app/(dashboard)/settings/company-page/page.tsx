import { getTihemsCompanyInfo } from '@/lib/sheets'
import CompanyPageSettings from './CompanyPageSettings'

export default async function CompanyPagePage() {
  const info = await getTihemsCompanyInfo()
  return <CompanyPageSettings info={info} />
}
