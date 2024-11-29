'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreateQuiz({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [quizType, setQuizType] = useState<string>('multiple-choice')
  const [questionAmount, setQuestionAmount] = useState<number>(5)
  const [customInstructions, setCustomInstructions] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // First generate quiz content
      const generateResponse = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.id,
          quizType,
          questionAmount,
          customInstructions,
        }),
      })

      const generatedData = await generateResponse.json()
      if (!generatedData.success) {
        throw new Error(generatedData.error)
      }

      // Then create quiz in database
      const createResponse = await fetch('/api/create-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.id,
          quizData: {
            title: `${quizType} Quiz`,
            type: quizType,
            questions: generatedData.quiz.questions,
            status: 'draft'
          }
        }),
      })

      const createData = await createResponse.json()
      if (!createResponse.ok) {
        throw new Error(createData.error)
      }

      router.push(`/project/${params.id}/quizzes`)
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create quiz')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Quiz</CardTitle>
          <CardDescription>Customize your quiz settings</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateQuiz}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-type">Quiz Type</Label>
              <Select value={quizType} onValueChange={setQuizType}>
                <SelectTrigger id="quiz-type">
                  <SelectValue placeholder="Select quiz type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="open-ended">Open Ended</SelectItem>
                  <SelectItem value="flash-cards">Flash Cards</SelectItem>
                  <SelectItem value="oral-exam">Oral Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-amount">Number of Questions</Label>
              <Input
                id="question-amount"
                type="number"
                min="1"
                max="50"
                value={questionAmount}
                onChange={(e) => setQuestionAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-instructions">Custom Instructions for AI</Label>
              <Textarea
                id="custom-instructions"
                placeholder="Enter any specific instructions for the AI to generate your quiz..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Quiz...' : 'Create Quiz'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
