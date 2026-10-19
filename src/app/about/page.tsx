import { getTihemsCompanyInfo } from '@/lib/sheets'
import AboutClient from './AboutClient'

export const metadata = { title: 'About Tihems' }

export default async function AboutPage() {
  const info = await getTihemsCompanyInfo()
  return <AboutClient info={info} />
}
