import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '../../auth.config'
import { getUserRole } from '@/lib/sheets'
import type { UserRole } from '@/types'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
    Credentials({
      name: 'Shared Access',
      credentials: { name: { type: 'text' }, password: { type: 'password' } },
      async authorize(credentials) {
        const pw = process.env.SHARED_ACCESS_PASSWORD
        if (!pw || credentials.password !== pw) return null
        const name = String(credentials.name ?? '').trim()
        if (name.length < 2) return null
        return { id: `${name.toLowerCase().replace(/\s+/g,'.')}.shared@internal`, name, email: `${name.toLowerCase().replace(/\s+/g,'.')}.shared@internal`, image: null }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
        if (adminEmails.includes(user.email!)) return true
        try { return (await getUserRole(user.email!)) !== null } catch { return false }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.provider = account?.provider ?? 'credentials'
        const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
        if (adminEmails.includes(user.email ?? '')) token.role = 'Admin' as UserRole
        else if (account?.provider === 'credentials') token.role = 'DataEntry' as UserRole
        else {
          try { token.role = (await getUserRole(user.email!)) ?? 'Viewer' as UserRole }
          catch { token.role = 'Viewer' as UserRole }
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.role     = token.role     as UserRole
      session.user.provider = token.provider as string
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
})
