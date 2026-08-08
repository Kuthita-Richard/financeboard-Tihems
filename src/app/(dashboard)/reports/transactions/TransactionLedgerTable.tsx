'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Pencil, Trash2, X, Loader2, Save } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/utils'
import { updateTransactionAction, deleteTransactionAction } from '@/actions'
import type { TransactionRecord, OrgSettings, OrgMetadata } from '@/types'

interface Props {
  rows: TransactionRecord[]
  settings: OrgSettings
  metadata: OrgMetadata
  sym: string
  total: number
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[#0284c7]'
const inputStyle = { background: '#fff', borderColor: '#bfdbfe', color: '#0c1a2e' }

export default function TransactionLedgerTable({ rows, settings, metadata, sym, total }: Props) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'Admin'
  const [editing, setEditing] = useState<TransactionRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (row: TransactionRecord) => {
    if (!confirm(`Delete this transaction (${row.customerName}, ${formatCurrencyCompact(row.amountPaid, sym)})? This cannot be undone.`)) return
    setDeletingId(row.id)
    const res = await deleteTransactionAction(row.rowIndex, `${row.customerName} | ${row.product} | ${row.amountPaid}`)
    setDeletingId(null)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor:"#bfdbfe" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:900 }}>
            <thead>
              <tr style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe" }}>
                {["ID","Date",settings.customerLabel,settings.regionLabel,settings.productLabel,settings.gatewayLabel,settings.salesRepLabel,`Amount (${sym})`,"Status","Reference","Notes"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:"#4b6a8f" }}>{h}</th>
                ))}
                {isAdmin && <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider no-print" style={{ color:"#4b6a8f" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={r.id} style={{ borderBottom:"1px solid #e0f2fe", background: i%2===0?"#fff":"#f0f9ff" }}>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color:"#4b6a8f" }}>{r.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color:"#0c1a2e" }}>{r.date}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color:"#0c1a2e" }}>{r.customerName}</td>
                  <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{r.region}</td>
                  <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{r.product}</td>
                  <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{r.gateway}</td>
                  <td className="px-3 py-2" style={{ color:"#4b6a8f" }}>{r.salesRep}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color:"#0284c7" }}>{formatCurrencyCompact(r.amountPaid, sym)}</td>
                  <td className="px-3 py-2" style={{ color: r.status==="Active"?"#16a34a":"#dc2626" }}>{r.status}</td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color:"#0c1a2e" }}>{r.referenceNumber}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate" style={{ color:"#4b6a8f" }}>{r.notes}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 no-print">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(r)} aria-label="Edit"
                          className="p-1.5 rounded-md hover:opacity-70" style={{ background:"#e0f2fe", color:"#0284c7" }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(r)} disabled={deletingId === r.id} aria-label="Delete"
                          className="p-1.5 rounded-md hover:opacity-70 disabled:opacity-50" style={{ background:"#fee2e2", color:"#dc2626" }}>
                          {deletingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              <tr style={{ background:"#eff6ff", borderTop:"2px solid #bfdbfe" }}>
                <td colSpan={7} className="px-3 py-2.5 font-bold text-right text-xs" style={{ color:"#0c1a2e" }}>TOTAL</td>
                <td className="px-3 py-2.5 tabular-nums font-bold text-xs" style={{ color:"#0284c7" }}>{formatCurrencyCompact(total, sym)}</td>
                <td colSpan={isAdmin ? 3 : 2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditTransactionModal
          row={editing}
          settings={settings}
          metadata={metadata}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function EditTransactionModal({ row, settings, metadata, onClose }: {
  row: TransactionRecord; settings: OrgSettings; metadata: OrgMetadata; onClose: () => void
}) {
  const [form, setForm] = useState({
    date: row.date, customerName: row.customerName, region: row.region,
    product: row.product, gateway: row.gateway, salesRep: row.salesRep,
    amountPaid: row.amountPaid, status: row.status,
    referenceNumber: row.referenceNumber, notes: row.notes,
  })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const onSave = async () => {
    setSaving(true)
    const res = await updateTransactionAction(
      row.rowIndex,
      { recordedBy: row.recordedBy, recordedByEmail: row.recordedByEmail, recordedAt: row.recordedAt },
      form
    )
    setSaving(false)
    if (res.success) { toast.success(res.message); onClose() }
    else toast.error(res.message)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(12,26,46,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: '#0c1a2e' }}>Edit Transaction</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: '#4b6a8f' }}><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value as 'Active' | 'Inactive')} className={inputCls} style={inputStyle}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>{settings.customerLabel} Name</label>
          <input value={form.customerName} onChange={e => set('customerName', e.target.value)} className={inputCls} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>{settings.productLabel}</label>
            <select value={form.product} onChange={e => set('product', e.target.value)} className={inputCls} style={inputStyle}>
              {metadata.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>{settings.gatewayLabel}</label>
            <select value={form.gateway} onChange={e => set('gateway', e.target.value)} className={inputCls} style={inputStyle}>
              {metadata.gateways.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>{settings.regionLabel}</label>
            <select value={form.region} onChange={e => set('region', e.target.value)} className={inputCls} style={inputStyle}>
              {metadata.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>{settings.salesRepLabel}</label>
            <select value={form.salesRep} onChange={e => set('salesRep', e.target.value)} className={inputCls} style={inputStyle}>
              {metadata.salesReps.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>Amount Paid ({settings.currencySymbol})</label>
            <input type="number" step="0.01" value={form.amountPaid}
              onChange={e => set('amountPaid', Number(e.target.value))} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>Reference Number</label>
            <input value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color:'#4b6a8f' }}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} style={inputStyle} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#4b6a8f' }}>Cancel</button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: '#0284c7', color: 'white' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
