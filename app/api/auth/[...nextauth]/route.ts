import NextAuth from 'next-auth'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔑 Auth attempt for email:', credentials?.email)
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials')
            throw new Error('Invalid credentials')
          }

          await connectToDatabase()
          console.log('✅ DB connected')

          const user = await User.findOne({ email: credentials.email })
          console.log('🔍 User found:', user ? 'Yes' : 'No')

          if (!user) {
            console.log('❌ User not found')
            throw new Error('Invalid credentials')
          }

          console.log('👤 User status:', user.status)
          if (user.status !== 'active') {
            console.log('❌ User not active')
            throw new Error('Account is ' + user.status)
          }

          console.log('🔒 Checking account lock...')
          if (user.lockUntil && user.lockUntil > new Date()) {
            console.log('❌ Account locked until:', user.lockUntil)
            throw new Error('Account is temporarily locked. Try again later.')
          }

          console.log('🔐 Validating password...')
          const isValid = await bcrypt.compare(credentials.password, user.password)
          console.log('🔑 Password valid:', isValid)

          if (isValid) {
            console.log('📝 Current user state:', JSON.stringify(user.toObject(), null, 2))

            const updateDoc = {
              loginAttempts: 0,
              lockUntil: new Date(0),
              lastLogin: new Date()
            }
            console.log('📝 Update document:', JSON.stringify(updateDoc, null, 2))

            try {
              await User.updateOne(
                { _id: user._id },
                { $set: updateDoc }
              )
              console.log('✅ User updated successfully')
            } catch (error) {
              console.error('❌ Update failed:', error)
              const updateError = error as { errInfo?: { details?: { schemaRulesNotSatisfied?: unknown } } }
              if (updateError.errInfo?.details?.schemaRulesNotSatisfied) {
                console.error('Schema validation errors:', 
                  JSON.stringify(updateError.errInfo.details.schemaRulesNotSatisfied, null, 2)
                )
              }
              throw error
            }

            console.log('✅ Login successful')
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              status: user.status,
              settings: user.settings
            }
          }

          user.loginAttempts = (user.loginAttempts || 0) + 1
          console.log('❌ Login attempts:', user.loginAttempts)

          if (user.loginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
            console.log('�� Account locked until:', user.lockUntil)
          }

          await user.save()
          throw new Error('Invalid credentials')
        } catch (error) {
          console.error('❌ Auth error:', error)
          throw error
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
        token.settings = user.settings
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'user' | 'admin'
        session.user.status = token.status as 'active' | 'banned' | 'deleted'
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
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET
})

export { handler as GET, handler as POST }