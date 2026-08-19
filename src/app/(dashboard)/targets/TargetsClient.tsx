'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { targetSchema } from '@/schemas'
import { createTargetAction, updateTargetAction, deleteTargetAction } from '@/actions'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle, XCircle, Pencil, Trash2, X, Save } from 'lucide-react'
import type { OrgSettings, OrgMetadata, TargetRecord } from '@/types'
import { MONTHS, formatCurrencyCompact } from '@/lib/utils'
import { z } from 'zod'

type TargetInput = z.infer<typeof targetSchema>
interface Props { targets: TargetRecord[]; settings: OrgSettings; metadata: OrgMetadata; filter: { year: string; month: string; dim: string } }

const DIMENSION_TYPES = ['Gateway'] as const

export default function TargetsClient({ targets, settings, metadata, filter }: Props) {
  const [showForm, setShowForm]     = useState(false)
  const [pending, startTransition]  = useTransition()
  const [editingTarget, setEditingTarget] = useState<TargetRecord | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const sym = settings.currencySymbol

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TargetInput>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      year: new Date().getFullYear(), month: MONTHS[new Date().getMonth()],
      dimensionType: 'Gateway', dimensionValue: '', region: '',
      amountAnnualTarget: 0, amountRevisedTarget: 0,
      countAnnualTarget: 0, countRevisedTarget: 0, active: true,
    },
  })

  const dimType = watch('dimensionType')

  const getDimOptions = (type: string) => {
    if (type === 'Gateway')  return metadata.gateways
    if (type === 'SalesRep') return metadata.salesReps
    return []
  }

  const onSubmit = async (data: TargetInput) => {
    startTransition(async () => {
      const result = await createTargetAction(data)
      if (result.success) { toast.success(result.message); reset(); setShowForm(false) }
      else toast.error(result.message)
    })
  }

  const iCls   = 'w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-1 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all'
  const iStyle = { background:'#ffffff', borderColor:'#bfdbfe', color:'#0c1a2e' }
  const Field  = ({ label, error, children }: { label:string; error?:string; children:React.ReactNode }) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )

  // Filter displayed targets
  const displayed = targets
    .filter(t => !filter.year  || String(t.year)          === filter.year)
    .filter(t => !filter.month || t.month                  === filter.month)
    .filter(t => !filter.dim   || t.dimensionType          === filter.dim)
    .sort((a,b) => { if (a.year !== b.year) return b.year - a.year; return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month) })

  const dimLabel = (type: string) => {
    if (type === 'Product')  return settings.productLabel
    if (type === 'Gateway')  return settings.gatewayLabel
    if (type === 'Region')   return settings.regionLabel
    if (type === 'SalesRep') return settings.salesRepLabel
    return type
  }

  const handleDelete = async (t: TargetRecord) => {
    if (!confirm(`Delete this target (${dimLabel(t.dimensionType)}: ${t.dimensionValue}, ${t.month} ${t.year})? This cannot be undone.`)) return
    setDeletingId(t.id)
    const res = await deleteTargetAction(t.rowIndex, `${dimLabel(t.dimensionType)}:${t.dimensionValue} ${t.month} ${t.year}`)
    setDeletingId(null)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color:'var(--fg)' }}>Targets</h2>
          <p className="text-sm mt-1" style={{ color:'var(--muted-fg)' }}>
            Set {settings.gatewayLabel.toLowerCase()} targets, per {settings.regionLabel.toLowerCase()} — a target
            carries forward automatically each month until you enter a new one, so you only add a row when it
            actually changes. Overall, {settings.regionLabel}, {settings.productLabel}, and {settings.salesRepLabel} totals
            are all computed automatically from these — see Settings → Classifications for how schemes are classified.
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background:'#0284c7', color:'white' }}>
          <Plus size={15} /> Add Target
        </button>
      </div>

      {/* Add target form */}
      {showForm && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background:'#fff', borderColor:'#bfdbfe' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'#4b6a8f' }}>New Target</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year" error={errors.year?.message}>
                <input type="number" {...register('year', { valueAsNumber:true })} min="2000" max="2100" className={iCls} style={iStyle} />
              </Field>
              <Field label="Month" error={errors.month?.message}>
                <select {...register('month')} className={iCls} style={iStyle}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {/* Dimension */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Dimension Type" error={errors.dimensionType?.message}>
                <select {...register('dimensionType')} className={iCls} style={iStyle}>
                  {DIMENSION_TYPES.map(d => <option key={d} value={d}>{dimLabel(d)}</option>)}
                </select>
              </Field>
              <Field label="Dimension Value" error={errors.dimensionValue?.message}>
                <select {...register('dimensionValue')} className={iCls} style={iStyle}>
                  <option value="">Select {dimLabel(dimType)}</option>
                  {getDimOptions(dimType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label={settings.regionLabel} error={errors.region?.message}>
                <select {...register('region')} className={iCls} style={iStyle}>
                  <option value="">Select {settings.regionLabel.toLowerCase()}</option>
                  {metadata.regions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>

            {/* Amount targets */}
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Amount Annual Plan (${sym})`} error={errors.amountAnnualTarget?.message}>
                <input type="number" step="0.01" min="0" {...register('amountAnnualTarget', { valueAsNumber:true })} placeholder="0.00" className={iCls} style={iStyle} />
              </Field>
              <Field label={`Amount Revised Target (${sym})`} error={errors.amountRevisedTarget?.message}>
                <input type="number" step="0.01" min="0" {...register('amountRevisedTarget', { valueAsNumber:true })} placeholder="0.00" className={iCls} style={iStyle} />
              </Field>
            </div>

            {/* Count targets */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Customer Count Annual Plan" error={errors.countAnnualTarget?.message}>
                <input type="number" min="0" {...register('countAnnualTarget', { valueAsNumber:true })} placeholder="0" className={iCls} style={iStyle} />
              </Field>
              <Field label="Customer Count Revised Target" error={errors.countRevisedTarget?.message}>
                <input type="number" min="0" {...register('countRevisedTarget', { valueAsNumber:true })} placeholder="0" className={iCls} style={iStyle} />
              </Field>
            </div>

            {/* Active + Notes */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <Field label="Status">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('active')} className="w-4 h-4 rounded" />
                  <span className="text-sm" style={{ color:'#0c1a2e' }}>Active for this month</span>
                </label>
              </Field>
              <Field label="Notes (optional)">
                <input type="text" {...register('notes')} placeholder="Any context…" className={iCls} style={iStyle} />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={pending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                style={{ background:'#0284c7', color:'white' }}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {pending ? 'Saving…' : 'Save Target'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm hover:opacity-70"
                style={{ border:'1px solid #bfdbfe', color:'#4b6a8f' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Targets table */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border p-16 text-center" style={{ borderColor:'#bfdbfe' }}>
          <p className="text-sm font-medium mb-1" style={{ color:'#0c1a2e' }}>No targets yet</p>
          <p className="text-xs" style={{ color:'#4b6a8f' }}>Click Add Target to set monthly targets per dimension.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#bfdbfe' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:900 }}>
              <thead>
                <tr style={{ background:'#eff6ff', borderBottom:'1px solid #bfdbfe' }}>
                  {['Year','Month','Dimension','Value',settings.regionLabel,`Amt Annual Plan`,`Amt Revised`,`Count Plan`,`Count Revised`,'Active','Notes','Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px] whitespace-nowrap" style={{ color:'#4b6a8f' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom:'1px solid #e0f2fe', background: i%2===0?'#fff':'#f0f9ff' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color:'#0c1a2e' }}>{t.year}</td>
                    <td className="px-3 py-2.5" style={{ color:'#0c1a2e' }}>{t.month}</td>
                    <td className="px-3 py-2.5" style={{ color:'#4b6a8f' }}>{dimLabel(t.dimensionType)}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color:'#0c1a2e' }}>{t.dimensionValue}</td>
                    <td className="px-3 py-2.5" style={{ color:'#4b6a8f' }}>{t.region || <span className="italic opacity-60">unassigned</span>}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{formatCurrencyCompact(t.amountAnnualTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#0c1a2e' }}>{formatCurrencyCompact(t.amountRevisedTarget, sym)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{t.countAnnualTarget}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color:'#4b6a8f' }}>{t.countRevisedTarget}</td>
                    <td className="px-3 py-2.5">
                      {t.active
                        ? <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle size={12} /> Active</span>
                        : <span className="flex items-center gap-1 text-red-500 font-semibold"><XCircle size={12} /> Inactive</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[150px] truncate" style={{ color:'#4b6a8f' }}>{t.notes}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingTarget(t)} aria-label="Edit"
                          className="p-1.5 rounded-md hover:opacity-70" style={{ background:'#e0f2fe', color:'#0284c7' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} aria-label="Delete"
                          className="p-1.5 rounded-md hover:opacity-70 disabled:opacity-50" style={{ background:'#fee2e2', color:'#dc2626' }}>
                          {deletingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTarget && (
        <EditTargetModal
          target={editingTarget}
          settings={settings}
          metadata={metadata}
          onClose={() => setEditingTarget(null)}
        />
      )}
    </div>
  )
}

function EditTargetModal({ target, settings, metadata, onClose }: {
  target: TargetRecord; settings: OrgSettings; metadata: OrgMetadata; onClose: () => void
}) {
  const sym = settings.currencySymbol
  const dimLabel = (type: string) => {
    if (type === 'Product')  return settings.productLabel
    if (type === 'Gateway')  return settings.gatewayLabel
    if (type === 'Region')   return settings.regionLabel
    if (type === 'SalesRep') return settings.salesRepLabel
    return type
  }
  const getDimOptions = (type: string) => {
    if (type === 'Gateway')  return metadata.gateways
    if (type === 'SalesRep') return metadata.salesReps
    return []
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TargetInput>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      year: target.year, month: target.month,
      dimensionType: target.dimensionType, dimensionValue: target.dimensionValue,
      region: target.region,
      amountAnnualTarget: target.amountAnnualTarget, amountRevisedTarget: target.amountRevisedTarget,
      countAnnualTarget: target.countAnnualTarget, countRevisedTarget: target.countRevisedTarget,
      active: target.active, notes: target.notes,
    },
  })
  const dimType = watch('dimensionType')
  const [saving, setSaving] = useState(false)

  const iCls   = 'w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-1 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all'
  const iStyle = { background:'#ffffff', borderColor:'#bfdbfe', color:'#0c1a2e' }

  const onSubmit = async (data: TargetInput) => {
    setSaving(true)
    const res = await updateTargetAction(target.rowIndex, data)
    setSaving(false)
    if (res.success) { toast.success(res.message); onClose() }
    else toast.error(res.message)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(12,26,46,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: '#0c1a2e' }}>Edit Target</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: '#4b6a8f' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Year</label>
              <input type="number" {...register('year', { valueAsNumber:true })} min="2000" max="2100" className={iCls} style={iStyle} />
              {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Month</label>
              <select {...register('month')} className={iCls} style={iStyle}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Dimension Type</label>
              {/* Read-only — a target's fundamental type never changes on edit.
                  Also avoids an option-mismatch for legacy Sales Rep/Overall/
                  Product/Region rows that predate Sales Rep becoming a
                  computed roll-up (see docs/TARGETS_MODEL.md) and would no
                  longer appear in DIMENSION_TYPES' now-single option. */}
              <input type="text" value={dimLabel(target.dimensionType)} readOnly className={iCls} style={{ ...iStyle, opacity:0.6 }} {...register('dimensionType')} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Dimension Value</label>
              <select {...register('dimensionValue')} className={iCls} style={iStyle}>
                {getDimOptions(dimType).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>{settings.regionLabel}</label>
              <select {...register('region')} className={iCls} style={iStyle}>
                <option value="">Select {settings.regionLabel.toLowerCase()}</option>
                {metadata.regions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.region && <p className="text-xs text-red-500">{errors.region.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Amount Annual Plan ({sym})</label>
              <input type="number" step="0.01" min="0" {...register('amountAnnualTarget', { valueAsNumber:true })} className={iCls} style={iStyle} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Amount Revised Target ({sym})</label>
              <input type="number" step="0.01" min="0" {...register('amountRevisedTarget', { valueAsNumber:true })} className={iCls} style={iStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Customer Count Annual Plan</label>
              <input type="number" min="0" {...register('countAnnualTarget', { valueAsNumber:true })} className={iCls} style={iStyle} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Customer Count Revised Target</label>
              <input type="number" min="0" {...register('countRevisedTarget', { valueAsNumber:true })} className={iCls} style={iStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <label className="flex items-center gap-2 cursor-pointer pt-5">
              <input type="checkbox" {...register('active')} className="w-4 h-4 rounded" />
              <span className="text-sm" style={{ color:'#0c1a2e' }}>Active for this month</span>
            </label>
            <div className="space-y-1">
              <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>Notes</label>
              <input type="text" {...register('notes')} className={iCls} style={iStyle} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#4b6a8f' }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#0284c7', color: 'white' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
