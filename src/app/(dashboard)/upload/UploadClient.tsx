'use client'
import { useState, useRef } from 'react'
import { importTransactionsAction } from '@/actions'
import { toast } from 'sonner'
import { FileSpreadsheet, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react'
import type { OrgSettings } from '@/types'

interface Props { settings: OrgSettings }

export default function UploadClient({ settings }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<{ success:number; failed:number; errors:string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel (.xlsx/.xls) or CSV file')
      return
    }
    setLoading(true); setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await importTransactionsAction(formData)
    setLoading(false)
    setResult(res)
    if (res.success > 0) toast.success(res.message)
    else toast.error(res.message)
  }

  const downloadTemplate = () => {
    const headers = ['date','customerName','region','product','gateway','salesRep','amountPaid','status','referenceNumber','notes']
    const sample  = ['2024-01-15','Acme Corp','North','Product A','M-Pesa','Alice Johnson','50000','Active','QK7X8Y9Z1A','Regular payment']
    const csv     = [headers.join(','), sample.join(',')].join('\n')
    const a       = document.createElement('a')
    a.href        = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download    = 'tihems-transaction-template.csv'
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${dragging ? 'border-[#0284c7] bg-[#eff6ff]' : 'border-[#bfdbfe] bg-white'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        {loading
          ? <><Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color:'#0284c7' }} /><p className="text-sm font-medium" style={{ color:'#0284c7' }}>Importing…</p></>
          : <><FileSpreadsheet size={36} className="mx-auto mb-3" style={{ color: dragging ? '#0284c7' : '#bfdbfe' }} />
              <p className="text-sm font-semibold mb-1" style={{ color:'#0c1a2e' }}>Drag and drop your file here</p>
              <p className="text-xs" style={{ color:'#4b6a8f' }}>or click to browse · Accepts .xlsx, .xls, .csv</p></>}
      </div>

      {/* Template download */}
      <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background:'#eff6ff', borderColor:'#bfdbfe' }}>
        <div>
          <p className="text-xs font-semibold" style={{ color:'#0c1a2e' }}>Download Template</p>
          <p className="text-[10px]" style={{ color:'#4b6a8f' }}>CSV with correct column names and an example row</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80"
          style={{ background:'#0284c7', color:'white' }}>
          <Download size={13} /> Template
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
          <div className="flex items-center gap-6">
            {result.success > 0 ? (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color:'#16a34a' }}>
                <CheckCircle size={16} /> {result.success} imported
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color:'#dc2626' }}>
                <XCircle size={16} /> Nothing was imported
              </div>
            )}
            {result.failed > 0 && <div className="flex items-center gap-2 text-sm font-semibold" style={{ color:'#dc2626' }}>
              <XCircle size={16} /> {result.failed} failed
            </div>}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e,i) => <p key={i} className="text-xs" style={{ color:'#dc2626' }}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Column guide */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
        <div className="px-4 py-3 border-b" style={{ background:'#eff6ff', borderColor:'#bfdbfe' }}>
          <p className="text-xs font-bold" style={{ color:'#0c1a2e' }}>Accepted Column Names</p>
          <p className="text-[10px] mt-0.5" style={{ color:'#4b6a8f' }}>Case-insensitive, spaces and underscores ignored</p>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {[
              ['Date',                'date'],
              ['Customer Name',       'customerName, customer, name, patientName, client, member'],
              [settings.regionLabel,  'region, branch, territory, zone'],
              [settings.productLabel, 'product, service, item, category, department'],
              [settings.gatewayLabel, 'gateway, paymentGateway, paymentMethod, method, channel, payment'],
              [settings.salesRepLabel,'salesRep, rep, officer, agent, staff, executive'],
              ['Amount Paid',         'amountPaid, amount, paid, amountReceived, total'],
              ['Status',              'status (Active/Inactive, defaults to Active)'],
              ['Reference Number',    'referenceNumber, reference, refNo, receiptNo, lpo, mpesaCode (optional)'],
              ['Notes',               'notes, remarks, comments (optional)'],
            ].map(([field, aliases], i) => (
              <tr key={field} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                <td className="px-4 py-2.5 font-semibold w-40" style={{ color:'#0c1a2e' }}>{field}</td>
                <td className="px-4 py-2.5" style={{ color:'#4b6a8f' }}>{aliases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
