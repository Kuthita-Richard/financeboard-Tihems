'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appConfigSchema, authorizedUserSchema } from '@/schemas'
import { updateSettingsAction, upsertUserAction } from '@/actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save, UserPlus, Shield, Eye, Edit } from 'lucide-react'
import type { OrgSettings, AuthorizedUser, UserRole } from '@/types'
import { z } from 'zod'

type AppConfigInput = z.infer<typeof appConfigSchema>
type UserInput      = z.infer<typeof authorizedUserSchema>
interface Props { settings: OrgSettings; users: AuthorizedUser[] }

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  Admin:     Shield,
  DataEntry: Edit,
  Viewer:    Eye,
}

const ROLE_COLORS: Record<UserRole, string> = {
  Admin:     '#6366f1',
  DataEntry: '#22c55e',
  Viewer:    '#64748b',
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--muted-fg)' }}>{label}</label>
      {children}
      {hint && <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
    </div>
  )
}

function Toggle({ label, hint, register }: { label: string; hint?: string; register: ReturnType<typeof useForm<AppConfigInput>>['register'] }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
        {hint && <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{hint}</p>}
      </div>
      <input type="checkbox" {...register('requireEntryNotes')} className="w-4 h-4 rounded" />
    </label>
  )
}

export default function AppConfigSettings({ settings, users }: Props) {
  const [saving,     setSaving]     = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [localUsers, setLocalUsers] = useState(users)

  const { register, handleSubmit } = useForm<AppConfigInput>({
    resolver: zodResolver(appConfigSchema),
    defaultValues: {
      productLabel:           settings.productLabel,
      gatewayLabel:           settings.gatewayLabel,
      regionLabel:            settings.regionLabel,
      salesRepLabel:          settings.salesRepLabel,
      customerLabel:          settings.customerLabel,
      perfThresholdExceeding: settings.perfThresholdExceeding,
      perfThresholdOnTrack:   settings.perfThresholdOnTrack,
      perfThresholdAtRisk:    settings.perfThresholdAtRisk,
      requireEntryNotes:      settings.requireEntryNotes,
    },
  })

  const userForm = useForm<UserInput>({ resolver: zodResolver(authorizedUserSchema) })

  const onSubmit = async (data: AppConfigInput) => {
    setSaving(true)
    const res = await updateSettingsAction(data)
    setSaving(false)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  const onAddUser = async (data: UserInput) => {
    setAddingUser(true)
    const res = await upsertUserAction(data)
    setAddingUser(false)
    if (res.success) {
      toast.success(res.message)
      setLocalUsers(prev => {
        const filtered = prev.filter(u => u.email !== data.email)
        return [...filtered, { email: data.email, role: data.role as UserRole, addedAt: new Date().toISOString(), addedBy: '' }]
      })
      userForm.reset()
      setShowAdd(false)
    } else {
      toast.error(res.message)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)] transition-all'
  const inputStyle = { background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--fg)' }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Dynamic Labels */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Dynamic Field Labels</p>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            These labels appear everywhere in the app — forms, filters, charts, and PDFs.
            Change them to match your organisation (e.g. Service, Branch, Officer).
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Product Label" hint="Was 'Product'">
              <input {...register('productLabel')} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Gateway Label" hint="Was 'Payment Gateway'">
              <input {...register('gatewayLabel')} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Region Label" hint="Was 'Region'">
              <input {...register('regionLabel')} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Sales Rep Label" hint="Was 'Sales Rep'">
              <input {...register('salesRepLabel')} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Customer Label" hint="Was 'Customer'">
              <input {...register('customerLabel')} className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* Performance Thresholds */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Performance Flag Thresholds</p>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Achievement % determines the flag. Flags below &apos;At Risk&apos; are automatically &apos;Below Target&apos;.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="🟢 Exceeding ≥ (%)" hint="Default: 100%">
              <input type="number" {...register('perfThresholdExceeding', { valueAsNumber: true })} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="🔵 On Track ≥ (%)" hint="Default: 90%">
              <input type="number" {...register('perfThresholdOnTrack', { valueAsNumber: true })} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="🟡 At Risk ≥ (%)" hint="Default: 75%">
              <input type="number" {...register('perfThresholdAtRisk', { valueAsNumber: true })} className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* Behaviour */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Behaviour</p>
          <Toggle label="Require Entry Notes" hint="Notes field is mandatory on every new entry" register={register} />
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'white' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>

      {/* User Management */}
      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>Authorised Users</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>
              Google sign-in requires the email be listed below, or set in the ADMIN_EMAILS environment
              variable (which always gets Admin access without needing to be added here). Shared Access
              sign-in uses a password only — no email — and anyone who has it gets DataEntry access under
              whatever name they type.
            </p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--primary)', color: 'white' }}>
            <UserPlus size={13} />
            Add User
          </button>
        </div>

        {/* Add user form */}
        {showAdd && (
          <form onSubmit={userForm.handleSubmit(onAddUser)} className="flex gap-3 p-3 rounded-xl"
            style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <input {...userForm.register('email')} type="email" placeholder="user@example.com"
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }} />
            <select {...userForm.register('role')}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
              <option value="Viewer">Viewer</option>
              <option value="DataEntry">DataEntry</option>
              <option value="Admin">Admin</option>
            </select>
            <button type="submit" disabled={addingUser}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'white' }}>
              {addingUser ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
            </button>
          </form>
        )}

        {/* User list */}
        <div className="space-y-2">
          {localUsers.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--muted-fg)' }}>
              No users added yet. Admin emails from environment variables always have access.
            </p>
          ) : localUsers.map(user => {
            const Icon  = ROLE_ICONS[user.role]
            const color = ROLE_COLORS[user.role]
            return (
              <div key={user.email} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                style={{ background: 'var(--input)', borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${color}20`, color }}>
                  {user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--fg)' }}>{user.email}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                    Added {new Date(user.addedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  style={{ background: `${color}15`, color }}>
                  <Icon size={11} />
                  {user.role}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
