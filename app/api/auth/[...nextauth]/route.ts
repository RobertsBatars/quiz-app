import NextAuth from 'next-auth'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        await connectToDatabase()

        const user = await User.findOne({ email: credentials.email })

        if (!user) {
          throw new Error('Invalid credentials')
        }

        // Check if user is banned or deleted
        if (user.status !== 'active') {
          throw new Error('Account is ' + user.status)
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > new Date()) {
          throw new Error('Account is temporarily locked. Try again later.')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          // Increment login attempts
          user.loginAttempts = (user.loginAttempts || 0) + 1

          // Lock account after 5 failed attempts
          if (user.loginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          }

          await user.save()
          throw new Error('Invalid credentials')
        }

        // Reset login attempts and lock on successful login
        user.loginAttempts = 0
        user.lockUntil = null
        user.lastLogin = new Date()
        await user.save()

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          settings: user.settings
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.status = user.status
        token.settings = user.settings
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.status = token.status as string
        session.user.settings = token.settings as {
          emailNotifications: boolean
          twoFactorEnabled: boolean
          theme: 'light' | 'dark' | 'system'
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
})

export { handler as GET, handler as POST }