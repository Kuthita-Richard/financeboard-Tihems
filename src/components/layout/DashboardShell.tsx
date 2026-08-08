'use client'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import type { OrgSettings } from '@/types'

interface Props { settings: OrgSettings; title: string; subtitle?: string; children: React.ReactNode }

export default function DashboardShell({ settings, title, subtitle, children }: Props) {
  const [open, setOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Ignore user cancellation or unsupported fullscreen APIs.
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className={[
        'flex-shrink-0 z-50 transition-transform duration-300 ease-in-out',
        'fixed inset-y-0 left-0 w-72 lg:static lg:w-56 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        <Sidebar settings={settings} onNavigate={() => setOpen(false)} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setOpen(o => !o)} sidebarOpen={open}
          isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
