'use client'

import { useState, useTransition } from 'react'
import { Loader2, Sparkles, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  setSchemeDepartmentAction, removeSchemeDepartmentAction,
  setSchemeSalesRepAction, removeSchemeSalesRepAction,
} from '@/actions'
import type { OrgSettings } from '@/types'

interface SchemeRow {
  gateway: string
  inferredDept: string | null; overrideDept: string | null
  inferredRep:  string | null; overrideRep:  string | null
}
interface Props { schemes: SchemeRow[]; departments: string[]; salesReps: string[]; settings: OrgSettings }

/** One editable classification cell — reused for both Department and Sales Rep columns, since the UX is identical. */
function ClassificationCell({ gateway, inferred, override, options, optionLabel, onSet, onClear }: {
  gateway: string; inferred: string | null; override: string | null; options: string[]; optionLabel: string
  onSet: (gateway: string, value: string) => Promise<{ success: boolean; message: string }>
  onClear: (gateway: string) => Promise<{ success: boolean; message: string }>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(override ?? inferred ?? '')
  const [pending, startTransition] = useTransition()

  const effective  = override ?? inferred
  const isOverride = !!override

  const save = () => {
    if (!draft) return
    startTransition(async () => {
      const res = await onSet(gateway, draft)
      if (res.success) { toast.success(res.message); setEditing(false) }
      else toast.error(res.message)
    })
  }

  const clear = () => {
    startTransition(async () => {
      const res = await onClear(gateway)
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={draft} onChange={e => setDraft(e.target.value)} disabled={pending}
          className="px-2 py-1 rounded-lg text-xs border outline-none focus:border-[var(--primary)]"
          style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        >
          <option value="">Choose {optionLabel.toLowerCase()}…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" onClick={save} disabled={pending || !draft}
          className="text-xs font-medium hover:opacity-70 disabled:opacity-40" style={{ color: 'var(--primary)' }}>
          {pending ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
        </button>
        <button type="button" onClick={() => { setEditing(false); setDraft(override ?? inferred ?? '') }}
          disabled={pending} className="text-xs hover:opacity-70 disabled:opacity-40" style={{ color: 'var(--muted-fg)' }}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {effective ? (
        <span className="inline-flex items-center gap-1.5">
          {effective}
          {isOverride
            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>Manual</span>
            : <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
                <Sparkles size={9} /> Auto
              </span>}
        </span>
      ) : (
        <span className="text-xs italic" style={{ color: 'var(--muted-fg)' }}>Unclassified</span>
      )}
      <button type="button" onClick={() => setEditing(true)} title={`Set manual ${optionLabel.toLowerCase()} override`}
        className="opacity-60 hover:opacity-100"><Pencil size={12} /></button>
      {isOverride && (
        <button type="button" onClick={clear} disabled={pending} title="Clear override, use auto-detected"
          className="opacity-60 hover:opacity-100 disabled:opacity-30"><X size={12} /></button>
      )}
    </div>
  )
}

export default function SchemeMappingSettings({ schemes, departments, salesReps, settings }: Props) {
  const gatewayLabel = settings.gatewayLabel
  const productLabel = settings.productLabel
  const repLabel      = settings.salesRepLabel

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Every {productLabel.toLowerCase()} and {repLabel.toLowerCase()} target is now computed by summing the
          {' '}{gatewayLabel} targets classified under it here — neither is entered directly anymore. Classification
          is automatic, based on how each {gatewayLabel.toLowerCase()} has actually been recorded in the ledger
          (whichever {productLabel.toLowerCase()}/{repLabel.toLowerCase()} it&apos;s most often used with wins).
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
          You only need to touch this if a {gatewayLabel.toLowerCase()} is new (no transactions yet, so nothing to
          detect from) or an auto-detected classification is wrong — set a manual override and it takes permanent
          precedence over auto-detection until cleared.
        </p>
      </div>

      {schemes.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          No {gatewayLabel.toLowerCase()}s registered yet — add some under Settings → Data Lists or record a transaction first.
        </p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
                <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>{gatewayLabel}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>{productLabel}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>{repLabel}</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map(s => (
                <tr key={s.gateway} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>{s.gateway}</td>
                  <td className="px-3 py-2.5 text-sm">
                    <ClassificationCell
                      gateway={s.gateway} inferred={s.inferredDept} override={s.overrideDept}
                      options={departments} optionLabel={productLabel}
                      onSet={setSchemeDepartmentAction} onClear={removeSchemeDepartmentAction}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    <ClassificationCell
                      gateway={s.gateway} inferred={s.inferredRep} override={s.overrideRep}
                      options={salesReps} optionLabel={repLabel}
                      onSet={setSchemeSalesRepAction} onClear={removeSchemeSalesRepAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
