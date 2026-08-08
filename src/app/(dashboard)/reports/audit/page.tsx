import { getOrgSettings, getTransactions } from "@/lib/sheets"
import { MONTHS, formatCurrencyCompact, formatPct } from "@/lib/utils"
import type { Metadata } from "next"
import { PrintButton } from '@/components/ui/PrintButton'
import { ReportHeader } from '@/components/ui/ReportHeader'
export const metadata: Metadata = { title: "Audit Log" }
export default async function ReportAuditPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams

  const [settings, txs] = await Promise.all([getOrgSettings(), getTransactions()])
  const rows = txs.map(r => ({ date: r.recordedAt?.slice(0,10) || r.date, user: r.recordedBy, action: "CREATE_TX", id: r.id, details: r.customerName + " · " + r.product + " · " + r.gateway }))
    .sort((a,b) => b.date.localeCompare(a.date))
    .filter(r => !sp.user || r.user === sp.user)
  return (
    <div className="space-y-5">
      <ReportHeader settings={settings} title={`Audit Log`} />
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold" style={{ color:"var(--fg)" }}>Audit Log</h2>
          <p className="text-sm mt-1" style={{ color:"var(--muted-fg)" }}>{rows.length} entries · All recorded transactions</p>
        </div>
        <PrintButton />
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:700 }}>
            <thead><tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
              {["Date","User","Action","Record ID","Details"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color:"#4b6a8f" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map((r,i) => (
              <tr key={r.id+i} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color:"#4b6a8f" }}>{r.date}</td>
                <td className="px-3 py-2 font-medium" style={{ color:"#0c1a2e" }}>{r.user}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background:"#eff6ff", color:"#0284c7" }}>{r.action}</span></td>
                <td className="px-3 py-2 font-mono text-[10px]" style={{ color:"#4b6a8f" }}>{r.id}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color:"#4b6a8f" }}>{r.details}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
