'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brandingSettingsSchema } from '@/schemas'
import { updateSettingsAction } from '@/actions'
import { toast } from 'sonner'
import { Loader2, Save, BarChart2 } from 'lucide-react'
import type { OrgSettings } from '@/types'
import { z } from 'zod'

type BrandingInput = z.infer<typeof brandingSettingsSchema>

const FONTS = ['Inter', 'Poppins', 'DM Sans', 'Plus Jakarta Sans', 'Geist'] as const
const MODES = ['light', 'dark', 'system'] as const

const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)] transition-all'

function ColorField({ label, field, hint, register, error }: {
  label: string
  field: keyof BrandingInput
  hint?: string
  register: ReturnType<typeof useForm<BrandingInput>>['register']
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          {...register(field)}
          className="w-10 h-10 rounded-lg border cursor-pointer p-1"
          style={{ background: 'var(--input)', borderColor: 'var(--border)' }}
        />
        <input
          type="text"
          {...register(field)}
          placeholder="#6366f1"
          className={`flex-1 ${inputCls}`}
          style={inputStyle}
        />
      </div>
      {hint  && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}

interface Props { settings: OrgSettings }

export default function BrandingSettings({ settings }: Props) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BrandingInput>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: {
      primaryColor:   settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      sidebarColor:   settings.sidebarColor,
      accentColor:    settings.accentColor,
      defaultMode:    settings.defaultMode,
      fontFamily:     settings.fontFamily as BrandingInput['fontFamily'],
    },
  })

  const watched = watch()

  const onSubmit = async (data: BrandingInput) => {
    setSaving(true)
    const res = await updateSettingsAction(data)
    setSaving(false)
    if (res.success) {
      toast.success(res.message, { description: 'Reload the page to see color changes.' })
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Colors */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Brand Colors</p>
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Primary Color"   field="primaryColor"   hint="Buttons, active nav, chart bars"     register={register} error={errors.primaryColor?.message} />
            <ColorField label="Secondary Color" field="secondaryColor" hint="Hover states, secondary elements"    register={register} error={errors.secondaryColor?.message} />
            <ColorField label="Sidebar Color"   field="sidebarColor"   hint="Navigation sidebar background"      register={register} error={errors.sidebarColor?.message} />
            <ColorField label="Accent Color"    field="accentColor"    hint="Live badge, success indicators"     register={register} error={errors.accentColor?.message} />
          </div>
        </div>

        {/* Font & Mode */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Typography & Mode</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>Font Family</label>
              <select {...register('fontFamily')} className={inputCls} style={inputStyle}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>Default Mode</label>
              <select {...register('defaultMode')} className={inputCls} style={inputStyle}>
                {MODES.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="rounded-xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Live Preview</p>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {/* Mini sidebar */}
            <div className="flex h-32">
              <div className="w-28 flex flex-col p-2 gap-1" style={{ background: watched.sidebarColor }}>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: watched.primaryColor }}>
                    <BarChart2 size={10} color="white" />
                  </div>
                  <span className="text-[9px] font-bold text-white truncate">{settings.orgName}</span>
                </div>
                {['Overview', 'Analysis', 'Reports'].map((item, i) => (
                  <div key={item} className="px-2 py-1 rounded text-[8px]"
                    style={{ background: i === 0 ? `${watched.primaryColor}25` : 'transparent', color: i === 0 ? watched.primaryColor : '#94a3b8' }}>
                    {item}
                  </div>
                ))}
              </div>
              {/* Mini main */}
              <div className="flex-1 p-3 space-y-2" style={{ background: '#08090e' }}>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Target', 'Actual', 'Met'].map((label, i) => (
                    <div key={label} className="rounded-lg p-1.5 border" style={{ background: '#10121a', borderColor: '#1a1d2e', borderTop: `2px solid ${i === 0 ? watched.primaryColor : i === 1 ? watched.secondaryColor : watched.accentColor}` }}>
                      <p className="text-[7px] uppercase tracking-wide" style={{ color: '#64748b' }}>{label}</p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: '#f1f5f9' }}>—</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border h-8 flex items-center px-2" style={{ background: '#10121a', borderColor: '#1a1d2e' }}>
                  <div className="h-2 rounded" style={{ width: '60%', background: watched.primaryColor }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </form>
    </div>
  )
}
