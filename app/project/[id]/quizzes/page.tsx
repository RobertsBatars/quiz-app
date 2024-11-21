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

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      // In a real app, fetch quizzes for this project from the backend
      setQuizzes([
        { id: 'multiple-choice-1', name: 'General Knowledge', type: 'multiple-choice' },
        { id: 'open-ended-1', name: 'Essay Questions', type: 'open-ended' },
        { id: 'flash-cards-1', name: 'Vocabulary Review', type: 'flash-cards' },
        { id: 'oral-exam-1', name: 'Speaking Practice', type: 'oral-exam' },
      ])
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Quizzes for Project</h1>
      <Link href={`/project/${params.id}/create-quiz`}>
        <Button className="mb-6">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Quiz
        </Button>
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
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
        ))}
      </div>
    </div>
  )
}

