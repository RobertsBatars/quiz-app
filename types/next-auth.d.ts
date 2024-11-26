import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface UserSettings {
    emailNotifications: boolean
    twoFactorEnabled: boolean
    theme: 'light' | 'dark' | 'system'
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'user' | 'admin'
      status: 'active' | 'banned' | 'deleted'
      settings: UserSettings
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'user' | 'admin'
    status: 'active' | 'banned' | 'deleted'
    settings: UserSettings
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'user' | 'admin'
    status: 'active' | 'banned' | 'deleted'
    settings: UserSettings
  }
}