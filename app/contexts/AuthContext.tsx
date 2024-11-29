'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useNotification } from '@/app/hooks/useNotification'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Project {
  id: string
  name: string
  userId: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  createProject: (name: string) => Promise<void>
  getProjects: () => Promise<Project[]>
  projects: Project[] // Add this line
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([]) // Add this line
  const router = useRouter()
  const { showNotification } = useNotification()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
        role: session.user.role,
      })
    } else if (status === 'unauthenticated') {
      setUser(null)
    }
  }, [session, status])

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        showNotification('error', 'Invalid email or password')
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Registration failed')
        throw new Error(data.error)
      }

      showNotification('success', 'Registration successful')

      // Login after successful registration
      await login(email, password)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut({ redirect: false })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const createProject = async (name: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Failed to create project')
        throw new Error(data.error)
      }

      showNotification('success', 'Project created successfully')

      setProjects((prevProjects) => [...prevProjects, data.project]) // Add this line

      return data.project
    } catch (error) {
      console.error('Create project error:', error)
      throw error
    }
  }

  const getProjects = async () => {
    if (!user) throw new Error('Not authenticated')

    try {
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setProjects(data.projects) // Add this line

      return data.projects
    } catch (error) {
      console.error('Get projects error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
        login,
        register,
        logout,
        createProject,
        getProjects,
        projects, // Add this line
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
