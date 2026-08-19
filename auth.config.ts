import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import type { UserRole } from '@/types'

export const authConfig: NextAuthConfig = {
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
    Credentials({
      name: 'Shared Access',
      credentials: { name: { label: 'Your Name', type: 'text' }, password: { label: 'Password', type: 'password' } },
      authorize: () => null,
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn   = !!auth?.user
      const isPublic     = ['/login', '/api/auth', '/manual', '/about'].some(p => nextUrl.pathname.startsWith(p))
      if (isPublic) {
        if (isLoggedIn && nextUrl.pathname === '/login')
          return Response.redirect(new URL('/', nextUrl))
        return true
      }
      if (!isLoggedIn) {
        const url = new URL('/login', nextUrl)
        url.searchParams.set('callbackUrl', nextUrl.pathname)
        return Response.redirect(url)
      }
      const role = (auth as { user?: { role?: string } }).user?.role
      if (nextUrl.pathname.startsWith('/settings') && role !== 'Admin')
        return Response.redirect(new URL('/', nextUrl))
      if (nextUrl.pathname.startsWith('/targets') && role === 'Viewer')
        return Response.redirect(new URL('/', nextUrl))
      if ((nextUrl.pathname.startsWith('/entry') || nextUrl.pathname.startsWith('/upload')) && role === 'Viewer')
        return Response.redirect(new URL('/', nextUrl))
      return true
    },
    // Middleware (proxy.ts) decodes the session JWT using ONLY this shared
    // config — it never runs the fuller callbacks in src/lib/auth.ts. The
    // JWT itself already carries `role` (written in by that fuller config's
    // own jwt() callback at sign-in), but without a session() callback here
    // too, Auth.js exposes only the default {name,email,image} shape to
    // `auth.user` inside authorized() above — so `role` always read as
    // undefined, and every role check above silently failed (in the
    // `!== 'Admin'` case, that meant blocking real Admins from /settings;
    // in the `=== 'Viewer'` cases, it meant never blocking Viewers at all).
    session({ session, token }) {
      session.user.role     = token.role     as UserRole
      session.user.provider = token.provider as string
      return session
    },
  },
  session: { strategy: 'jwt' },
}
