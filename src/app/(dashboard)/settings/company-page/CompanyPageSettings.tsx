'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import { tihemsCompanySchema } from '@/schemas'
import { updateTihemsCompanyInfoAction } from '@/actions'
import { Field } from '@/components/ui/Field'
import type { TihemsCompanyInfo, TihemsCompanyPage } from '@/types'
import { z } from 'zod'

const companyFormSchema = tihemsCompanySchema.omit({ pages: true })
type CompanyFormInput = z.infer<typeof companyFormSchema>
interface Props { info: TihemsCompanyInfo }

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)] transition-all'
const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

let nextTempId = 0
const newPageId = () => `page-${Date.now()}-${nextTempId++}`

export default function CompanyPageSettings({ info }: Props) {
  const [saving, setSaving] = useState(false)
  const [pages, setPages] = useState<TihemsCompanyPage[]>(info.pages)

  const { register, handleSubmit, formState: { errors } } = useForm<CompanyFormInput>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: info.companyName, tagline: info.tagline,
      email: info.email, phone: info.phone, address: info.address, website: info.website,
      linkedinUrl: info.linkedinUrl, twitterUrl: info.twitterUrl,
      facebookUrl: info.facebookUrl, instagramUrl: info.instagramUrl,
    },
  })

  const addPage = () => setPages(p => [...p, { id: newPageId(), title: 'New Tab', content: '' }])
  const removePage = (id: string) => setPages(p => p.filter(pg => pg.id !== id))
  const updatePage = (id: string, patch: Partial<TihemsCompanyPage>) =>
    setPages(p => p.map(pg => pg.id === id ? { ...pg, ...patch } : pg))
  const movePage = (index: number, dir: -1 | 1) => setPages(p => {
    const next = [...p]
    const target = index + dir
    if (target < 0 || target >= next.length) return p
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })

  const onSubmit = async (data: CompanyFormInput) => {
    setSaving(true)
    const res = await updateTihemsCompanyInfoAction({ ...data, pages })
    setSaving(false)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border p-4" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
        <p className="text-xs" style={{ color: '#92400e' }}>
          This tab edits Tihems&apos;s own public <strong>/about</strong> page — not your organization&apos;s branding.
          Your logo and org name stay under Identity; this content is shared platform-wide.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Company Name" required error={errors.companyName?.message}>
          <input {...register('companyName')} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Tagline" error={errors.tagline?.message}>
          <input {...register('tagline')} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" {...register('email')} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input {...register('phone')} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <input {...register('website')} placeholder="https://" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <input {...register('address')} className={inputCls} style={inputStyle} />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="LinkedIn URL" error={errors.linkedinUrl?.message}>
          <input {...register('linkedinUrl')} placeholder="https://" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Twitter / X URL" error={errors.twitterUrl?.message}>
          <input {...register('twitterUrl')} placeholder="https://" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Facebook URL" error={errors.facebookUrl?.message}>
          <input {...register('facebookUrl')} placeholder="https://" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Instagram URL" error={errors.instagramUrl?.message}>
          <input {...register('instagramUrl')} placeholder="https://" className={inputCls} style={inputStyle} />
        </Field>
      </div>

      {/* Dynamic tabs/pages editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Page Tabs ({pages.length}/20)
          </p>
          <button type="button" onClick={addPage} disabled={pages.length >= 20}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'white' }}>
            <Plus size={13} /> Add Tab
          </button>
        </div>

        {pages.map((pg, i) => (
          <div key={pg.id} className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <GripVertical size={14} style={{ color: 'var(--muted-fg)', opacity: 0.5 }} />
              <input value={pg.title} onChange={e => updatePage(pg.id, { title: e.target.value })}
                placeholder="Tab title" className={`flex-1 ${inputCls}`} style={inputStyle} />
              <button type="button" onClick={() => movePage(i, -1)} disabled={i === 0}
                className="px-2 py-1.5 text-xs rounded-lg disabled:opacity-30" style={{ color: 'var(--muted-fg)' }}>↑</button>
              <button type="button" onClick={() => movePage(i, 1)} disabled={i === pages.length - 1}
                className="px-2 py-1.5 text-xs rounded-lg disabled:opacity-30" style={{ color: 'var(--muted-fg)' }}>↓</button>
              <button type="button" onClick={() => removePage(pg.id)}
                className="px-2 py-1.5 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <textarea value={pg.content} onChange={e => updatePage(pg.id, { content: e.target.value })}
              rows={4} placeholder="Content for this tab. Leave a blank line between paragraphs."
              className={inputCls} style={inputStyle} />
          </div>
        ))}

        {pages.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: 'var(--muted-fg)' }}>
            No tabs yet — click &quot;Add Tab&quot; to create the first one.
          </p>
        )}
      </div>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'white' }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save Company Page'}
      </button>
    </form>
  )
}
