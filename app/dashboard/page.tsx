'use client'

import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PlusCircle } from 'lucide-react'

interface Project {
  id: string
  name: string
  userId: string
}

export default function Dashboard() {
  const { user, createProject, projects } = useAuth()
  const router = useRouter()
  const [newProjectName, setNewProjectName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      setIsLoading(false)
    }
  }, [user, router])

  const handleCreateProject = async () => {
    if (newProjectName) {
      await createProject(newProjectName)
      setNewProjectName('')
    }
  }

  if (isLoading || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user.name}!</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>Start a new quiz project</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-2">
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <Button onClick={handleCreateProject}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Project
          </Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(projects || []).map((project: Project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>Manage your quiz project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/project/${project.id}/upload`}>
                <Button className="w-full" variant="outline">Upload Files</Button>
              </Link>
              <Link href={`/project/${project.id}/quizzes`}>
                <Button className="w-full" variant="outline">Manage Quizzes</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

