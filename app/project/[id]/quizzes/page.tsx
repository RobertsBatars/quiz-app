'use client'

import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PlusCircle } from 'lucide-react'

interface Quiz {
  id: string;
  name: string;
  type: 'multiple-choice' | 'open-ended' | 'flash-cards' | 'oral-exam';
}

export default function ProjectQuizzes({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchQuizzes = async () => {
      try {
        const response = await fetch(`/api/quizzes?projectId=${params.id}`)
        
        if (response.status === 404) {
          // Handle 404 as empty state
          setQuizzes([])
          setError('')
          return
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch quizzes')
        }
        
        const data = await response.json()
        setQuizzes(data.quizzes?.map((quiz: any) => ({
          id: quiz._id,
          name: quiz.title,
          type: quiz.type
        })) || [])
        setError('')
      } catch (err) {
        console.error('Error fetching quizzes:', err)
        // Only show error for actual failures
        if (err instanceof Error && err.message !== 'Failed to fetch quizzes') {
          setError('An unexpected error occurred. Please try again.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuizzes()
  }, [user, router, params.id])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Quizzes for Project</h1>
      <Link href={`/project/${params.id}/create-quiz`}>
        <Button className="mb-6">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Quiz
        </Button>
      </Link>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}
      
      {isLoading ? (
        <div>Loading quizzes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <CardTitle>{quiz.name}</CardTitle>
                  <CardDescription>Type: {quiz.type.replace('-', ' ')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/project/${params.id}/quiz/${quiz.id}`} passHref>
                    <Button className="w-full" variant="default">
                      Take Quiz
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Quizzes Yet</CardTitle>
                <CardDescription>Click "Create New Quiz" to get started</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
