import { getOrgSettings, getTransactions } from "@/lib/sheets"
import { computeCustomerSummary } from "@/lib/performance"
import { MONTHS, formatCurrencyCompact, formatPct } from "@/lib/utils"
import type { Metadata } from "next"
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: "Customer Report" }
export default async function ReportCustomersPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams

  const [settings, txs] = await Promise.all([getOrgSettings(), getTransactions()])
  const filters = { year: sp.year ? parseInt(sp.year) : undefined, month: sp.month || undefined }
  const customers = computeCustomerSummary(txs, filters)
  const sym = settings.currencySymbol
  const total = customers.reduce((s,c) => s + c.totalAmount, 0)
  const totalCount = customers.reduce((s,c) => s + c.totalCount, 0)
  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`${settings.customerLabel} Report`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>{settings.customerLabel} Report</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{customers.length} customers · {totalCount} transactions · {formatCurrencyCompact(total, sym)} total</p>
        </div>
        <PrintButton />
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:800 }}>
            <thead><tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
              {["#",settings.customerLabel,`Total (${sym})`,"Transactions",`Top ${settings.productLabel}`,`Top ${settings.gatewayLabel}`,`Top ${settings.salesRepLabel}`,"Last Date","Regions"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:"#4b6a8f" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{customers.map((c,i) => (
              <tr key={c.customerName} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                <td className="px-3 py-2 font-bold" style={{ color:"#4b6a8f" }}>{i+1}</td>
                <td className="px-3 py-2 font-semibold" style={{ color:"#0c1a2e" }}>{c.customerName}</td>
                <td className="px-3 py-2 tabular-nums font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(c.totalAmount, sym)}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color:"#0c1a2e" }}>{c.totalCount}</td>
                <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{c.topProduct}</td>
                <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{c.topGateway}</td>
                <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{c.topSalesRep}</td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color:"#4b6a8f" }}>{c.lastTransaction}</td>
                <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{c.regions.join(", ")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
