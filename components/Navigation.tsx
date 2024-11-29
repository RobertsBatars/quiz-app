'use client'

import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Button } from "@/components/ui/button"
import { UserCircle } from 'lucide-react'

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            AI Quiz Maker
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Admin</Button>
                  </Link>
                )}
                <Button variant="destructive" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Login</Button>
                </Link>
                <Link href="/register">
                  <Button variant="default">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

