'use client'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import type { OrgSettings } from '@/types'

interface Props { settings: OrgSettings; title: string; subtitle?: string; children: React.ReactNode }

const COLLAPSE_STORAGE_KEY = 'tihems-sidebar-collapsed'

export default function DashboardShell({ settings, title, subtitle, children }: Props) {
  const [open, setOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Desktop-only icon-rail toggle. Defaults to expanded for a consistent
  // server-render; synced from localStorage right after mount so a
  // returning user's preference sticks without needing a cookie round-trip.
  const [collapsed, setCollapsed] = useState(false)
  // The mobile drawer is always full width (w-72) regardless of the
  // desktop collapse preference — without this, a collapsed preference set
  // on desktop would render icon-only content inside the wide mobile
  // drawer, wasting most of its width.
  const [isDesktop, setIsDesktop] = useState(false)

  // These two intentionally sync state right after mount rather than using
  // a lazy useState initializer — reading window.matchMedia/localStorage
  // during the initializer would run before hydration and cause a
  // server/client markup mismatch, since the server has no window at all.
  // Syncing in an effect (after hydration) is the correct, standard way to
  // apply a browser-only preference without that mismatch.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(COLLAPSE_STORAGE_KEY) : null
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if (stored === '1') setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try { window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0') } catch { /* private browsing etc — not worth failing over */ }
      return next
    })
  }, [])

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
        'flex-shrink-0 z-50 transition-all duration-300 ease-in-out',
        'fixed inset-y-0 left-0 w-72 lg:static',
        collapsed ? 'lg:w-16' : 'lg:w-56',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        {/* Mobile drawer always shows full-width/expanded — collapse is a
            desktop-only preference. isDesktop gates it so a preference set
            on desktop doesn't render icon-only content inside the wide
            mobile drawer overlay. */}
        <Sidebar settings={settings} onNavigate={() => setOpen(false)}
          collapsed={collapsed && isDesktop} onToggleCollapse={toggleCollapsed} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setOpen(o => !o)} sidebarOpen={open}
          isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
