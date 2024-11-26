'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signOut } from 'next-auth/react'

export default function BannedPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Account {reason}</CardTitle>
          <CardDescription>
            {reason === 'banned' ? (
              'Your account has been banned due to violation of our terms of service.'
            ) : (
              'Your account has been deleted.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {reason === 'banned' ? (
              'If you believe this is a mistake, please contact our support team for assistance.'
            ) : (
              'If you would like to create a new account, you can register again.'
            )}
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.href = '/contact'}
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}