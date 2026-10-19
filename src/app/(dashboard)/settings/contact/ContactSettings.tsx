'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSettingsSchema } from '@/schemas'
import { updateSettingsAction } from '@/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { OrgSettings } from '@/types'
import { z } from 'zod'
import { Field } from '@/components/ui/Field'

type ContactInput = z.infer<typeof contactSettingsSchema>
interface Props { settings: OrgSettings }

export default function ContactSettings({ settings }: Props) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<ContactInput>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      primaryEmail:   settings.primaryEmail,
      supportEmail:   settings.supportEmail,
      phoneNumber:    settings.phoneNumber,
      address:        settings.address,
      postalCode:     settings.postalCode,
      linkedinUrl:    settings.linkedinUrl,
      otherSocialUrl: settings.otherSocialUrl,
    },
  })

  const onSubmit = async (data: ContactInput) => {
    setSaving(true)
    const res = await updateSettingsAction(data)
    setSaving(false)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)] transition-all'
  const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Contact Details</p>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>These appear in PDF report footers and cover pages.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary Email" error={errors.primaryEmail?.message}>
            <input type="email" {...register('primaryEmail')} className={inputCls} style={inputStyle} placeholder="contact@company.com" />
          </Field>
          <Field label="Support / Secondary Email" error={errors.supportEmail?.message}>
            <input type="email" {...register('supportEmail')} className={inputCls} style={inputStyle} placeholder="support@company.com" />
          </Field>
          <Field label="Phone Number">
            <input type="tel" {...register('phoneNumber')} className={inputCls} style={inputStyle} placeholder="+254 700 000 000" />
          </Field>
          <Field label="Postal Code">
            <input {...register('postalCode')} className={inputCls} style={inputStyle} placeholder="00100" />
          </Field>
        </div>
        <Field label="Physical Address">
          <textarea {...register('address')} rows={3} placeholder="123 Main Street, Nairobi, Kenya"
            className={inputCls} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Social Links (optional)</p>
        <Field label="LinkedIn URL" error={errors.linkedinUrl?.message}>
          <input {...register('linkedinUrl')} className={inputCls} style={inputStyle} placeholder="https://linkedin.com/company/..." />
        </Field>
        <Field label="Other Social / Website" error={errors.otherSocialUrl?.message}>
          <input {...register('otherSocialUrl')} className={inputCls} style={inputStyle} placeholder="https://..." />
        </Field>
      </div>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'white' }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save Contact'}
      </button>
    </form>
  )
}
