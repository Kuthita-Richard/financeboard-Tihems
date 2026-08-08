'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { addMetadataItemAction, editMetadataItemAction, deleteMetadataItemAction } from '@/actions'
import type { OrgMetadata, OrgSettings } from '@/types'

interface Props { metadata: OrgMetadata; settings: OrgSettings }

type Column = 'products' | 'gateways' | 'regions' | 'salesReps' | 'customers'

function Chip({ column, item }: { column: Column; item: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(item)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const onSave = () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === item) { setEditing(false); setDraft(item); return }
    startTransition(async () => {
      const res = await editMetadataItemAction(column, item, trimmed)
      if (res.success) { toast.success(res.message); setEditing(false) }
      else { toast.error(res.message); setDraft(item) }
    })
  }

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteMetadataItemAction(column, item)
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
      setConfirming(false)
    })
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--muted)' }}>
        <input
          autoFocus value={draft} disabled={pending}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onSave() }
            if (e.key === 'Escape') { setEditing(false); setDraft(item) }
          }}
          className="px-1.5 py-0.5 rounded text-xs border outline-none focus:border-[var(--primary)] w-32"
          style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <button type="button" onClick={onSave} disabled={pending} title="Save" className="hover:opacity-70 disabled:opacity-40">
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} style={{ color: 'var(--primary)' }} />}
        </button>
        <button type="button" onClick={() => { setEditing(false); setDraft(item) }} disabled={pending} title="Cancel" className="hover:opacity-70 disabled:opacity-40">
          <X size={12} style={{ color: 'var(--muted-fg)' }} />
        </button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--destructive-bg, #fee2e2)', color: 'var(--destructive, #b91c1c)' }}>
        Remove &quot;{item}&quot;?
        <button type="button" onClick={onDelete} disabled={pending} className="font-semibold hover:opacity-70 disabled:opacity-40">
          {pending ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="hover:opacity-70 disabled:opacity-40">No</button>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--muted)', color: 'var(--fg)' }}>
      {item}
      <button type="button" onClick={() => setEditing(true)} title="Rename" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
        <Pencil size={11} />
      </button>
      <button type="button" onClick={() => setConfirming(true)} title="Remove" className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
        <Trash2 size={11} />
      </button>
    </span>
  )
}

function ListEditor({ column, label, items }: { column: Column; label: string; items: string[] }) {
  const [value, setValue] = useState('')
  const [pending, startTransition] = useTransition()

  const onAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    startTransition(async () => {
      const res = await addMetadataItemAction(column, trimmed)
      if (res.success) { toast.success(res.message); setValue('') }
      else toast.error(res.message)
    })
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{label}</p>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
          placeholder={`Add a new ${label.toLowerCase()}…`}
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--primary)]"
          style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <button type="button" onClick={onAdd} disabled={pending || !value.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          Nothing registered yet — Entry/Upload/Targets will still offer any value already used in a real transaction, but a brand-new value needs to be added here first.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => <Chip key={item} column={column} item={item} />)}
        </div>
      )}
    </div>
  )
}

export default function DataListsSettings({ metadata, settings }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Manage the values that populate the dropdowns on Entry, Upload, and Targets. Values added here appear immediately everywhere. Hover a value to rename or remove it.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
          Removing a value here only stops it from being pre-registered — if it&apos;s already used in a real transaction, it&apos;ll keep appearing in dropdowns until nothing in the ledger references it. Renaming only updates the registry entry itself; it does not rewrite past transactions or targets that used the old text.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ListEditor column="products"  label={settings.productLabel}  items={metadata.products} />
        <ListEditor column="gateways"  label={settings.gatewayLabel}  items={metadata.gateways} />
        <ListEditor column="regions"   label={settings.regionLabel}   items={metadata.regions} />
        <ListEditor column="salesReps" label={settings.salesRepLabel} items={metadata.salesReps} />
        <ListEditor column="customers" label={settings.customerLabel} items={metadata.customers} />
      </div>
    </div>
  )
}
