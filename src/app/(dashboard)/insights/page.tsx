import InsightsClient from './InsightsClient'
import { getInsightsContextAction } from '@/actions'

export default async function InsightsPage() {
  const ctx = await getInsightsContextAction()
  return <InsightsClient {...ctx} />
}
