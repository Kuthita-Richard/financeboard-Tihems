import type { UserRole } from '@/types'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      name:     string
      email:    string
      image?:   string | null
      role:     UserRole
      provider: string
    }
  }
  interface JWT {
    role:     UserRole
    provider: string
  }
}
