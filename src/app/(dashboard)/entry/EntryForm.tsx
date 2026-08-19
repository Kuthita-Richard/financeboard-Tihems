'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema } from '@/schemas'
import { createTransactionAction } from '@/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import type { OrgSettings, OrgMetadata } from '@/types'
import { z } from 'zod'

type TxInput = z.infer<typeof transactionSchema>
interface Props { settings: OrgSettings; metadata: OrgMetadata }

function Field({ label, error, children, required, hint }: { label:string; error?:string; children:React.ReactNode; required?:boolean; hint?:string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color:'#4b6a8f' }}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px]" style={{ color:'#93a5bd' }}>{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function EntryForm({ settings, metadata }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TxInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { status: 'Active', date: new Date().toISOString().slice(0,10) },
  })

  const onSubmit = async (data: TxInput) => {
    setSubmitting(true)
    const result = await createTransactionAction(data)
    setSubmitting(false)
    if (result.success) { toast.success(result.message); reset({ status:'Active', date: new Date().toISOString().slice(0,10) }) }
    else toast.error(result.message)
  }

  const iCls  = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7]'
  const iStyle = { background:'#ffffff', borderColor:'#bfdbfe', color:'#0c1a2e' }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Date + Status */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date?.message}>
          <input type="date" {...register('date')} className={iCls} style={iStyle} />
        </Field>
        <Field label="Status">
          <select {...register('status')} className={iCls} style={iStyle}>
            {(metadata.statuses.length ? metadata.statuses : ['Active','Inactive']).map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* Customer name */}
      <Field label={`${settings.customerLabel} Name`} required error={errors.customerName?.message}>
        <input type="text" {...register('customerName')} placeholder={`Enter ${settings.customerLabel.toLowerCase()} name`}
          className={iCls} style={iStyle} list="customer-list" />
        <datalist id="customer-list">
          {metadata.customers.map(c => <option key={c} value={c} />)}
        </datalist>
      </Field>

      {/* Product + Gateway */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={settings.productLabel} required error={errors.product?.message}>
          <select {...register('product')} className={iCls} style={iStyle}>
            <option value="">Select {settings.productLabel}</option>
            {metadata.products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label={settings.gatewayLabel} required error={errors.gateway?.message}>
          <select {...register('gateway')} className={iCls} style={iStyle}>
            <option value="">Select {settings.gatewayLabel}</option>
            {metadata.gateways.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      </div>

      {/* Region + Sales Rep */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={settings.regionLabel} required error={errors.region?.message}>
          <select {...register('region')} className={iCls} style={iStyle}>
            <option value="">Select {settings.regionLabel}</option>
            {metadata.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label={settings.salesRepLabel} required error={errors.salesRep?.message}>
          <select {...register('salesRep')} className={iCls} style={iStyle}>
            <option value="">Select {settings.salesRepLabel}</option>
            {metadata.salesReps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      {/* Amount */}
      <Field label={`Amount Paid (${settings.currencySymbol})`} required error={errors.amountPaid?.message}>
        <input type="number" step="0.01" min="0" {...register('amountPaid', { valueAsNumber:true })}
          placeholder="0.00" className={iCls} style={iStyle} />
      </Field>

      {/* Reference number */}
      <Field label="Reference Number" error={errors.referenceNumber?.message}
        hint="Receipt no., LPO no., or M-Pesa transaction code — whatever proves this transaction">
        <input {...register('referenceNumber')} placeholder="e.g. QK7X8Y9Z1A"
          className={iCls} style={iStyle} />
      </Field>

      {/* Notes */}
      <Field label={`Notes${settings.requireEntryNotes ? ' *' : ' (optional)'}`} error={errors.notes?.message}>
        <textarea {...register('notes')} rows={2} placeholder="Any additional context…"
          className={iCls} style={{ ...iStyle, resize:'vertical' }} />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          style={{ background:'#0284c7', color:'white' }}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {submitting ? 'Saving…' : 'Save Transaction'}
        </button>
        <button type="button" onClick={() => reset({ status:'Active', date: new Date().toISOString().slice(0,10) })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm hover:opacity-70"
          style={{ border:'1px solid #bfdbfe', color:'#4b6a8f' }}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>
    </form>
  )
}
