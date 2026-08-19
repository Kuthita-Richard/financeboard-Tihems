'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { importTransactionsAction, reverseImportAction } from '@/actions'
import { toast } from 'sonner'
import { FileSpreadsheet, CheckCircle, XCircle, Download, Loader2, Undo2, History, AlertTriangle } from 'lucide-react'
import type { OrgSettings } from '@/types'

interface RecentImport { importBatchId: string; count: number; importedBy: string; importedAt: string; dateRange: string }
interface Props { settings: OrgSettings; recentImports: RecentImport[] }

export default function UploadClient({ settings, recentImports: initialRecentImports }: Props) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'Admin'
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<{ success:number; failed:number; errors:string[]; warnings:string[]; importBatchId?:string } | null>(null)
  const [recentImports, setRecentImports] = useState(initialRecentImports)
  const [reversing, setReversing] = useState<string | null>(null)
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

  const reverse = async (importBatchId: string) => {
    if (!confirm('Reverse this import? Every transaction from it will be permanently removed. This cannot be undone.')) return
    setReversing(importBatchId)
    const res = await reverseImportAction(importBatchId)
    setReversing(null)
    if (res.success) {
      toast.success(res.message)
      setRecentImports(prev => prev.filter(b => b.importBatchId !== importBatchId))
      if (result?.importBatchId === importBatchId) setResult(null)
    } else {
      toast.error(res.message)
    }
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
          <div className="flex items-center justify-between gap-4">
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
            {isAdmin && result.success > 0 && result.importBatchId && (
              <button onClick={() => reverse(result.importBatchId!)} disabled={reversing === result.importBatchId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50 shrink-0"
                style={{ background:'#fef2f2', color:'#dc2626' }}>
                {reversing === result.importBatchId ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                Reverse this import
              </button>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e,i) => <p key={i} className="text-xs" style={{ color:'#dc2626' }}>{e}</p>)}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto" style={{ background:'#fffbeb' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color:'#b45309' }}>
                <AlertTriangle size={12} /> Possible typos — not merged automatically, worth checking:
              </p>
              {result.warnings.map((w,i) => <p key={i} className="text-xs pl-4" style={{ color:'#b45309' }}>{w}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Recent Imports — undo any past import, not just the one just now */}
      {isAdmin && recentImports.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background:'#eff6ff', borderColor:'#bfdbfe' }}>
            <History size={13} style={{ color:'#0c1a2e' }} />
            <p className="text-xs font-bold" style={{ color:'#0c1a2e' }}>Recent Imports</p>
          </div>
          <div className="divide-y" style={{ borderColor:'#e0f2fe' }}>
            {recentImports.map(b => (
              <div key={b.importBatchId} className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderColor:'#e0f2fe' }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color:'#0c1a2e' }}>
                    {b.count} transaction{b.count === 1 ? '' : 's'} · {b.dateRange}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color:'#4b6a8f' }}>
                    Imported by {b.importedBy || 'unknown'}{b.importedAt ? ` · ${new Date(b.importedAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <button onClick={() => reverse(b.importBatchId)} disabled={reversing === b.importBatchId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50 shrink-0"
                  style={{ background:'#fef2f2', color:'#dc2626' }}>
                  {reversing === b.importBatchId ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                  Reverse
                </button>
              </div>
            ))}
          </div>
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
