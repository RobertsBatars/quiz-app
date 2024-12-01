'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PlusCircle, FileText, Book } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  userId: string
}

export default function Dashboard() {
  const { user, createProject, projects, getProjects } = useAuth()
  const router = useRouter()
  const [newProjectName, setNewProjectName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize loadProjects to prevent recreation on each render
  const loadProjects = useCallback(async () => {
    try {
      await getProjects()
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError('Failed to load projects')
      setIsLoading(false)
    }
  }, [getProjects])

  // Authentication check and initial project load
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!isInitialized) {
      loadProjects()
      setIsInitialized(true)
    }
  }, [user, router, loadProjects, isInitialized])

  const handleCreateProject = async () => {
    try {
      setError('')
      if (!newProjectName.trim()) {
        setError('Project name is required')
        return
      }

      await createProject(newProjectName)
      setNewProjectName('')
    } catch (err) {
      console.error('Project creation error:', err)
      setError('Failed to create project')
    }
  }

  if (isLoading || !user) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Start a new project workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex gap-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(projects) && projects.length > 0 ? (
          projects.map((project: Project) => (
            <Card 
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>Project Management</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link href={`/project/${project.id}/quizzes`}>
                  <Button className="w-full" variant="outline">
                    <Book className="mr-2 h-4 w-4" />
                    Manage Quizzes
                  </Button>
                </Link>
                <Link href={`/project/${project.id}/upload`}>
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Files
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Projects</CardTitle>
              <CardDescription>Create your first project to get started</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
