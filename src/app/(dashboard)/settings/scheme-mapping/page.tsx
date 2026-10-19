import { getTransactions, getSchemeDepartmentMap, getSchemeSalesRepMap, getMetadata, getOrgSettings } from '@/lib/sheets'
import { inferSchemeDepartments, inferSchemeSalesReps } from '@/lib/performance'
import { mergeDimensionOptions } from '@/lib/utils'
import SchemeMappingSettings from './SchemeMappingSettings'

export default async function SchemeMappingPage() {
  const [txs, manualDeptMap, manualRepMap, rawMeta, settings] = await Promise.all([
    getTransactions(), getSchemeDepartmentMap(), getSchemeSalesRepMap(), getMetadata(), getOrgSettings(),
  ])
  const metadata = mergeDimensionOptions(rawMeta, txs)
  const inferredDept = inferSchemeDepartments(txs)
  const inferredRep  = inferSchemeSalesReps(txs)
  const manualDept   = new Map(manualDeptMap.map(m => [m.gateway, m.department]))
  const manualRep    = new Map(manualRepMap.map(m => [m.gateway, m.salesRep]))

  const schemes = metadata.gateways.map(gateway => ({
    gateway,
    inferredDept: inferredDept.get(gateway) ?? null,
    overrideDept: manualDept.get(gateway) ?? null,
    inferredRep:  inferredRep.get(gateway) ?? null,
    overrideRep:  manualRep.get(gateway) ?? null,
  }))

  return (
    <SchemeMappingSettings
      schemes={schemes}
      departments={metadata.products}
      salesReps={metadata.salesReps}
      settings={settings}
    />
  )
}
