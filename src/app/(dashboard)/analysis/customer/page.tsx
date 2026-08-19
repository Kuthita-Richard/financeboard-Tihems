import { getTransactions, getOrgSettings } from '@/lib/sheets'
import { computeCustomerSummary } from '@/lib/performance'
import { formatCurrencyCompact } from '@/lib/utils'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Customer Analysis' }
export default async function CustomerAnalysisPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams
  const [settings, txs] = await Promise.all([getOrgSettings(), getTransactions()])
  const filters = {
    year:     sp.year     ? parseInt(sp.year) : undefined,
    month:    sp.month    || undefined,
    product:  sp.product  || undefined,
    gateway:  sp.gateway  || undefined,
    region:   sp.region   || undefined,
    salesRep: sp.salesRep || undefined,
  }
  const customers = computeCustomerSummary(txs, filters)
  const sym = settings.currencySymbol
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>{settings.customerLabel} Analysis</h2>
        <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
          {customers.length} {settings.customerLabel.toLowerCase()}s · Sorted by amount collected · No targets (informational only)
        </p>
      </div>
      {customers.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor:'#bfdbfe' }}>
          <p className="text-sm" style={{ color:'#4b6a8f' }}>No customer transactions found for this period.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:800 }}>
              <thead>
                <tr style={{ background:'#eff6ff', borderBottom:'1px solid #bfdbfe' }}>
                  {['#', settings.customerLabel, `Total (${sym})`, 'Transactions', `Top ${settings.productLabel}`, `Top ${settings.gatewayLabel}`, `Top ${settings.salesRepLabel}`, 'Last Date', 'Regions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:'#4b6a8f' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.customerName} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                    <td className="px-3 py-2.5 font-bold" style={{ color:'#4b6a8f' }}>{i+1}</td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color:'#0c1a2e' }}>{c.customerName}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color:'#0284c7' }}>{formatCurrencyCompact(c.totalAmount, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{c.totalCount}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:'#4b6a8f' }}>{c.topProduct}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:'#4b6a8f' }}>{c.topGateway}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:'#4b6a8f' }}>{c.topSalesRep}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:'#4b6a8f' }}>{c.lastTransaction}</td>
                    <td className="px-3 py-2.5" style={{ color:'#4b6a8f' }}>{c.regions.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
