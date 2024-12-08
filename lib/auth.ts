import { AuthOptions } from 'next-auth';
import { DefaultSession, Account, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';

// Extended types
export interface ExtendedSession extends DefaultSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    status: 'active' | 'banned' | 'deleted';
    settings: UserSettings;
  } & DefaultSession['user'];
}

export interface ExtendedJWT extends JWT {
  id: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'deleted';
  settings: UserSettings;
}

interface UserSettings {
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Invalid credentials');
          }

          await connectToDatabase();
          const user = await User.findOne({ email: credentials.email });

          if (!user || user.status !== 'active') {
            throw new Error('Invalid credentials');
          }

          if (user.lockUntil && user.lockUntil > new Date()) {
            throw new Error('Account is temporarily locked');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (isValid) {
            await User.updateOne(
              { _id: user._id },
              { 
                $set: {
                  loginAttempts: 0,
                  lockUntil: new Date(0),
                  lastLogin: new Date()
                }
              }
            );

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              status: user.status,
              settings: user.settings
            };
          }

          await User.updateOne(
            { _id: user._id },
            { 
              $inc: { loginAttempts: 1 },
              ...((user.loginAttempts + 1) >= 5 && {
                $set: { lockUntil: new Date(Date.now() + 15 * 60 * 1000) }
              })
            }
          );

          throw new Error('Invalid credentials');
        } catch (error) {
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as 'user' | 'admin';
        token.status = user.status as 'active' | 'banned' | 'deleted';
        token.settings = user.settings;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.settings = token.settings;
      }
      return session as ExtendedSession;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET
};