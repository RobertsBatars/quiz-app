'use client'

import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FileUpload from '@/components/FileUpload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProjectUpload({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Upload Files for Project</h1>
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>Upload files for your quiz project</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload projectId={params.id} />
        </CardContent>
      </Card>
    </div>
  )
}

