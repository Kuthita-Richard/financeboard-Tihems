'use client'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { LogOut, Bell, Menu, X, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  title: string; subtitle?: string; onMenuClick: () => void; sidebarOpen: boolean
  isFullscreen: boolean; onToggleFullscreen: () => void
}

export default function Topbar({ title, subtitle, onMenuClick, sidebarOpen, isFullscreen, onToggleFullscreen }: Props) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0 sticky top-0 z-20"
      style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} aria-label={sidebarOpen ? 'Close menu' : 'Open menu'} aria-expanded={sidebarOpen}
          className="lg:hidden flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold truncate" style={{ color: 'var(--fg)' }}>{title}</h1>
          {subtitle && <p className="text-[10px] truncate hidden sm:block" style={{ color: 'var(--muted-fg)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'color-mix(in oklch, var(--accent-clr) 12%, transparent)', color: 'var(--accent-clr)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-clr)' }} /> Live
        </div>
        <button onClick={onToggleFullscreen}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }} aria-label="Notifications">
          <Bell size={14} />
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border hover:opacity-80"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'var(--primary)' }}>{session?.user?.name?.[0]?.toUpperCase() ?? '?'}</div>
            <span className="text-xs font-medium hidden md:block" style={{ color: 'var(--fg)' }}>{session?.user?.name?.split(' ')[0]}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-lg z-20 p-1.5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>{session?.user?.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--muted-fg)' }}>{session?.user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase"
                    style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                    {session?.user?.role}
                  </span>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs hover:opacity-70"
                  style={{ color: '#dc2626' }}>
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
