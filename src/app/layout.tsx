import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { getOrgSettings } from '@/lib/sheets'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrgSettings()
  const name = settings.orgName || 'Tihems'
  return {
    title:       { default: name, template: `%s — ${name}` },
    description: settings.tagline || 'Performance Intelligence Dashboard',
    icons:       { icon: settings.faviconUrl || '/brand/tihems-favicon.jpeg' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getOrgSettings()])

  const cssVars = {
    '--primary':    settings.primaryColor,
    '--secondary':  settings.secondaryColor,
    '--sidebar':    settings.sidebarColor,
    '--accent-clr': settings.accentColor,
  } as React.CSSProperties

  return (
    <html lang="en" style={cssVars}>
      <body className={inter.className}>
        <SessionProvider session={session}>
          {children}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
