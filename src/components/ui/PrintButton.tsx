'use client'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-sm font-semibold no-print" style={{ background:"#0284c7", color:"white" }}>
      Print / Save PDF
    </button>
  )
}
