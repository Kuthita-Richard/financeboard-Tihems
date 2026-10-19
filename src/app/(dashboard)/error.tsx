'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'color-mix(in oklch, #dc2626 12%, transparent)' }}>
        <AlertTriangle size={24} color="#dc2626" />
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-1 max-w-sm" style={{ color: 'var(--muted-fg)' }}>
        {error.message?.includes('credentials')
          ? 'Could not connect to Google Sheets. Check your credentials in .env.local.'
          : 'An unexpected error occurred loading this page.'}
      </p>
      {error.digest && (
        <p className="text-[10px] mb-6 font-mono" style={{ color: 'var(--muted-fg)' }}>
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                   transition-opacity hover:opacity-80"
        style={{ background: 'var(--primary)', color: 'white' }}
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  )
}
