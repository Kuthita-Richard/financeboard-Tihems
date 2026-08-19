import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: 'var(--bg)' }}>
      <p className="text-7xl font-extrabold mb-4" style={{ color: 'var(--primary)' }}>404</p>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Page not found</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-fg)' }}>The page you are looking for does not exist.</p>
      <Link href="/" className="px-6 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: 'white' }}>
        Back to Dashboard
      </Link>
    </div>
  )
}
