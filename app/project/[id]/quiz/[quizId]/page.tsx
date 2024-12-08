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

const DEBUG_MODE = false;

interface Question {
  _id: string; // Now includes _id
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

// Add more detailed state typing
interface UserAnswers {
  [key: string]: string;
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
          const questionsWithIds = data.quiz.questions.map((q: Question, index: number) => ({
            ...q,
            _id: `temp-${index}-${Date.now()}`
          }))
          setQuestions(questionsWithIds)
          DEBUG_MODE && console.log('Questions loaded with temp IDs:', questionsWithIds)
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

  const handleOptionClick = (questionId: string, option: string) => {
    DEBUG_MODE && console.log('Option clicked:', { questionId, option })
    
    setUserAnswers(prev => {
      const updated = { ...prev, [questionId]: option }
      DEBUG_MODE && console.log('Updated answers:', updated)
      return updated
    })
  }

  const handleAnswer = (value: string) => {
    const questionId = questions[currentQuestion]._id
    DEBUG_MODE && console.log('Before update - Current answers:', userAnswers)
    
    setUserAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: value
      }
      DEBUG_MODE && console.log('After update - New answers:', newAnswers)
      return newAnswers
    })
  }

  // Update the handleSubmit function to include explanation
  const handleSubmit = () => {
    const results = questions.map((question, idx) => {
      const answer = userAnswers[question._id]
      const isCorrect = answer === question.correctAnswer
      
      return {
        questionNumber: idx + 1,
        question: question.question,
        userAnswer: answer || 'No answer provided',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        isCorrect
      }
    })
  
    const totalQuestions = questions.length
    const correctAnswers = results.filter(r => r.isCorrect).length
    const score = Math.round((correctAnswers / totalQuestions) * 100)
  
    // Add extra newline after score
    const formattedResults = `Score: ${score}% (${correctAnswers}/${totalQuestions} correct)\n\n${
      results.map(r => 
        `Question ${r.questionNumber}: ${r.question}
  Your Answer: ${r.userAnswer} ${r.isCorrect ? '✅' : '❌'}${
    !r.isCorrect 
      ? `\nCorrect Answer: ${r.correctAnswer}` 
      : ''
  }${
    r.explanation 
      ? `\nExplanation: ${r.explanation}` 
      : ''
  }`
      ).join('\n\n')
    }`
  
    setQuizResults(formattedResults)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setShowAnswer(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      setShowAnswer(false)
    }
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
              <div className="space-y-4">
                {question.options?.map((option, i) => (
                  <button
                    key={`${question._id}-${i}`} 
                    type="button"
                    className={`w-full p-4 rounded-lg border cursor-pointer transition-colors ${
                      userAnswers[question._id] === option 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleOptionClick(question._id, option)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border ${
                        userAnswers[question._id] === option 
                          ? 'bg-primary-foreground border-primary-foreground' 
                          : 'border-primary'
                      }`}>
                        {userAnswers[question._id] === option && (
                          <div className="w-full h-full rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
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
            <div className="space-y-6">
              {quizResults.split('\n\n').map((section, idx) => {
                if (section.startsWith('Score:')) {
                  return (
                    <div key={idx} className="text-xl font-bold">
                      {section}
                    </div>
                  )
                }
                
                const isCorrect = section.includes('✅')
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    isCorrect 
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
                      : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  }`}>
                    <pre className="whitespace-pre-wrap">
                      {section}
                    </pre>
                  </div>
                )
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push(`/project/${params.id}/quizzes`)}>
              Back to Quizzes
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
