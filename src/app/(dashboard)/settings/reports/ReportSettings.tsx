'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reportSettingsSchema } from '@/schemas'
import { updateSettingsAction } from '@/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { OrgSettings } from '@/types'
import { MONTHS } from '@/lib/utils'
import { CURRENCIES } from '@/lib/currency'
import { z } from 'zod'

type ReportInput = z.infer<typeof reportSettingsSchema>
interface Props { settings: OrgSettings }

export default function ReportSettings({ settings }: Props) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, setValue } = useForm<ReportInput>({
    resolver: zodResolver(reportSettingsSchema),
    defaultValues: {
      reportTitlePrefix: settings.reportTitlePrefix,
      preparedByDefault: settings.preparedByDefault,
      footerText:        settings.footerText,
      currencySymbol:    settings.currencySymbol,
      currencyCode:      settings.currencyCode || 'USD',
      currencyFormat:    settings.currencyFormat,
      dateFormat:        settings.dateFormat,
      fiscalYearStart:   settings.fiscalYearStart,
      includeWatermark:  settings.includeWatermark,
      watermarkText:     settings.watermarkText,
      showRecordedBy:    settings.showRecordedBy,
    },
  })

  const includeWatermark = watch('includeWatermark')
  const selectedCode     = watch('currencyCode')
  const selectedCurrency = CURRENCIES.find(c => c.code === selectedCode)

  const handleCurrencyChange = (code: string) => {
    const found = CURRENCIES.find(c => c.code === code)
    setValue('currencyCode', code)
    if (found) setValue('currencySymbol', found.symbol)
  }

  const onSubmit = async (data: ReportInput) => {
    setSaving(true)
    const res = await updateSettingsAction(data)
    setSaving(false)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)] transition-all'
  const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* PDF header / footer */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>PDF Header &amp; Footer</p>
        <Field label="Report Title Prefix" hint="Date/period appended automatically">
          <input {...register('reportTitlePrefix')} className={inputCls} style={inputStyle} placeholder="Performance Report —" />
        </Field>
        <Field label="Default Prepared By">
          <input {...register('preparedByDefault')} className={inputCls} style={inputStyle} placeholder="Finance Department" />
        </Field>
        <Field label="Footer Text">
          <textarea {...register('footerText')} rows={2} placeholder="Confidential. For internal use only."
            className={inputCls} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>
      </div>

      {/* Base currency */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Base Currency</p>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          The currency your data is entered in. Users can convert to any of 40 currencies on the
          dashboard — live exchange rates are fetched automatically, no API key needed.
        </p>

        <Field label="Base Currency" hint="Data entry amounts are assumed to be in this currency">
          <select
            value={selectedCode}
            onChange={e => handleCurrencyChange(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} style={{ background: 'var(--card)' }}>
                {c.flag} {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </Field>

        {/* Hidden fields kept in sync */}
        <input type="hidden" {...register('currencyCode')} />
        <input type="hidden" {...register('currencySymbol')} />

        {/* Live preview */}
        {selectedCurrency && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <span className="text-2xl">{selectedCurrency.flag}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                {selectedCurrency.code} — {selectedCurrency.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                Symbol: <strong>{selectedCurrency.symbol}</strong>
                {' · '}Example: <strong>{selectedCurrency.symbol}1,250,000</strong>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Number Format">
            <select {...register('currencyFormat')} className={inputCls} style={inputStyle}>
              <option value="comma-dot">1,000.00 (comma-dot)</option>
              <option value="dot-comma">1.000,00 (dot-comma)</option>
            </select>
          </Field>
          <Field label="Date Format">
            <select {...register('dateFormat')} className={inputCls} style={inputStyle}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
          <Field label="Fiscal Year Start">
            <select {...register('fiscalYearStart')} className={inputCls} style={inputStyle}>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Options */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Options</p>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Include Watermark</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Diagonal text on every PDF page</p>
          </div>
          <input type="checkbox" {...register('includeWatermark')} className="w-4 h-4 rounded" />
        </label>
        {includeWatermark && (
          <Field label="Watermark Text">
            <input {...register('watermarkText')} className={inputCls} style={inputStyle} placeholder="CONFIDENTIAL" />
          </Field>
        )}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Show Recorded By</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Include data entry attribution in PDF records</p>
          </div>
          <input type="checkbox" {...register('showRecordedBy')} className="w-4 h-4 rounded" />
        </label>
      </div>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'white' }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save Report Settings'}
      </button>
    </form>
  )
}
