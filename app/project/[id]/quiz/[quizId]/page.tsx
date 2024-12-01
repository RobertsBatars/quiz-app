'use client'

import { useAuth } from '../../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import OralExam from '@/components/OralExam'

interface Question {
  _id: string;
  question: string;
  type: 'multiple-choice' | 'open-ended' | 'flash-cards' | 'oral-exam';
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  aiRubric?: {
    keyPoints: string[];
    scoringCriteria: string;
  };
}

interface Quiz {
  _id: string;
  title: string;
  type: 'multiple-choice' | 'open-ended' | 'flash-cards' | 'oral-exam';
  questions: Question[];
  status: 'draft' | 'published' | 'archived';
}

export default function Quiz({ params }: { params: { id: string; quizId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [showAnswer, setShowAnswer] = useState(false)
  const [quizResults, setQuizResults] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/quizzes/${params.quizId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch quiz')
        }
        const data = await response.json()
        if (data.success && data.quiz) {
          setQuestions(data.quiz.questions)
        } else {
          console.error('Quiz not found')
          router.push(`/project/${params.id}/quizzes`)
        }
      } catch (error) {
        console.error('Error fetching quiz:', error)
        router.push(`/project/${params.id}/quizzes`)
      }
    }

    fetchQuiz()
  }, [user, router, params.id, params.quizId])

  const handleAnswer = (answer: string) => {
    setUserAnswers({ ...userAnswers, [questions[currentQuestion]._id]: answer })
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowAnswer(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setShowAnswer(false)
    }
  }

  const handleSubmit = () => {
    const results = questions.map((question, index) => {
      const userAnswer = userAnswers[question._id] || 'No answer provided'
      return `Question ${index + 1}: ${question.question}
Your Answer: ${userAnswer}
${question.correctAnswer ? `Correct Answer: ${question.correctAnswer}
Explanation: ${question.explanation}` : 'This question will be reviewed manually.'}`
    })
    setQuizResults(results.join('\n\n'))
  }

  if (!user || questions.length === 0) {
    return <div>Loading...</div>
  }

  const question = questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Quiz</h1>
      {!quizResults ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Question {currentQuestion + 1}</CardTitle>
            <CardDescription>{question.question}</CardDescription>
          </CardHeader>
          <CardContent>
            {question.type === 'multiple-choice' && (
              <RadioGroup
                value={userAnswers[question._id] || ''}
                onValueChange={(value) => handleAnswer(value)}
              >
                {question.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {question.type === 'open-ended' && (
              <Input
                value={userAnswers[question._id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Type your answer here"
              />
            )}
            {question.type === 'flash-cards' && (
              <div className="text-center">
                <AnimatePresence mode="wait">
                  {!showAnswer ? (
                    <motion.div
                      key="question"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: 90 }}
                      transition={{ duration: 0.3 }}
                      className="bg-blue-100 dark:bg-blue-900 p-8 rounded-lg shadow-lg cursor-pointer"
                      onClick={() => setShowAnswer(true)}
                    >
                      <h3 className="text-2xl font-bold mb-4">Click to reveal answer</h3>
                      <p className="text-lg">{question.question}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="answer"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: 90 }}
                      transition={{ duration: 0.3 }}
                      className="bg-green-100 dark:bg-green-900 p-8 rounded-lg shadow-lg cursor-pointer"
                      onClick={() => setShowAnswer(false)}
                    >
                      <h3 className="text-2xl font-bold mb-4">Answer</h3>
                      <p className="text-lg">{question.correctAnswer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {question.type === 'oral-exam' && (
              <OralExam question={question.question} />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handlePrevious} disabled={currentQuestion === 0} variant="outline">Previous</Button>
            {currentQuestion < questions.length - 1 ? (
              <Button onClick={handleNext} variant="default">Next</Button>
            ) : (
              <Button onClick={handleSubmit} variant="default">Submit</Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{quizResults}</pre>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push(`/project/${params.id}/quizzes`)}>Back to Quizzes</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

