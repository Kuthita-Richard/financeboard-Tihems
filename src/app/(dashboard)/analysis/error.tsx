'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
export default function AnalysisError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Analysis Error]', error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
      <AlertTriangle size={32} color="#dc2626" className="mb-3" />
      <h2 className="text-base font-bold mb-2" style={{ color: 'var(--fg)' }}>Could not load analysis</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--muted-fg)' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--primary)', color: 'white' }}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  )
}
