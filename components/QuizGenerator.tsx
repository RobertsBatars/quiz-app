'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { QuizType, GeneratedQuiz, MultipleChoiceQuestion, OpenEndedQuestion, FlashCard, OralExamQuestion } from '@/types/quiz'

export default function QuizGenerator() {
  const [content, setContent] = useState('')
  const [quizType, setQuizType] = useState<QuizType>('multiple-choice')
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, quizType }),
      })
      const data = await response.json()
      if (data.success) {
        setGeneratedQuiz(data.quiz)
      } else {
        console.error('Quiz generation failed')
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setIsGenerating(false)
  }

  const renderMultipleChoice = (questions: MultipleChoiceQuestion[]) => (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={i} className="p-4">
          <h4 className="font-semibold mb-2">Question {i + 1}</h4>
          <p className="mb-3">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((option, j) => (
              <div
                key={j}
                className={`p-2 rounded ${
                  j === q.correctAnswer
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {option}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Explanation: {q.explanation}
          </p>
        </Card>
      ))}
    </div>
  )

  const renderOpenEnded = (questions: OpenEndedQuestion[]) => (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={i} className="p-4">
          <h4 className="font-semibold mb-2">Question {i + 1}</h4>
          <p className="mb-3">{q.question}</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-3">
            <h5 className="font-medium mb-2">Sample Answer:</h5>
            <p>{q.sampleAnswer}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <h5 className="font-medium mb-2">Grading Rubric:</h5>
            <ul className="list-disc list-inside mb-2">
              {q.gradingRubric.keyPoints.map((point, j) => (
                <li key={j}>{point}</li>
              ))}
            </ul>
            <p className="text-sm">{q.gradingRubric.scoringCriteria}</p>
          </div>
        </Card>
      ))}
    </div>
  )

  const renderFlashCards = (cards: FlashCard[]) => (
    <div className="space-y-6">
      {cards.map((card, i) => (
        <Card key={i} className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
              <h5 className="font-medium mb-2">Front:</h5>
              <p>{card.front}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
              <h5 className="font-medium mb-2">Back:</h5>
              <p>{card.back}</p>
            </div>
          </div>
          {card.hints && card.hints.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium mb-1">Hints:</h5>
              <ul className="list-disc list-inside">
                {card.hints.map((hint, j) => (
                  <li key={j}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </div>
  )

  const renderOralExam = (sections: OralExamQuestion[]) => (
    <div className="space-y-6">
      {sections.map((section, i) => (
        <Card key={i} className="p-4">
          <h4 className="font-semibold mb-3">{section.topic}</h4>
          <div className="space-y-4">
            {section.questions.map((q, j) => (
              <div key={j} className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <p className="font-medium mb-2">{q.question}</p>
                <div className="ml-4">
                  <h6 className="font-medium text-sm mb-1">Expected Points:</h6>
                  <ul className="list-disc list-inside mb-2">
                    {q.expectedPoints.map((point, k) => (
                      <li key={k}>{point}</li>
                    ))}
                  </ul>
                  {q.followUpQuestions && q.followUpQuestions.length > 0 && (
                    <>
                      <h6 className="font-medium text-sm mb-1">Follow-up Questions:</h6>
                      <ul className="list-disc list-inside">
                        {q.followUpQuestions.map((followUp, k) => (
                          <li key={k}>{followUp}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )

  const renderQuiz = () => {
    if (!generatedQuiz) return null

    switch (quizType) {
      case 'multiple-choice':
        return renderMultipleChoice(generatedQuiz.questions as MultipleChoiceQuestion[])
      case 'open-ended':
        return renderOpenEnded(generatedQuiz.questions as OpenEndedQuestion[])
      case 'flash-cards':
        return renderFlashCards(generatedQuiz.questions as FlashCard[])
      case 'oral-exam':
        return renderOralExam(generatedQuiz.questions as OralExamQuestion[])
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste your content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
      />
      <Select value={quizType} onValueChange={(value) => setQuizType(value as QuizType)}>
        <SelectTrigger>
          <SelectValue placeholder="Select quiz type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
          <SelectItem value="open-ended">Open Ended</SelectItem>
          <SelectItem value="flash-cards">Flash Cards</SelectItem>
          <SelectItem value="oral-exam">Oral Exam</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleGenerate} disabled={!content || isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Quiz'}
      </Button>
      {generatedQuiz && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Generated Quiz:</h3>
          {renderQuiz()}
        </div>
      )}
    </div>
  )
}

