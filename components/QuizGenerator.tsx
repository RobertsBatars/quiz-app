'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function QuizGenerator() {
  const [content, setContent] = useState('')
  const [quizType, setQuizType] = useState('multiple-choice')
  const [generatedQuiz, setGeneratedQuiz] = useState('')
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

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste your content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
      />
      <Select value={quizType} onValueChange={setQuizType}>
        <SelectTrigger>
          <SelectValue placeholder="Select quiz type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
          <SelectItem value="open-ended">Open Ended</SelectItem>
          <SelectItem value="flash-cards">Flash Cards</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleGenerate} disabled={!content || isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Quiz'}
      </Button>
      {generatedQuiz && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <h3 className="text-lg font-semibold mb-2">Generated Quiz:</h3>
          <pre className="whitespace-pre-wrap">{generatedQuiz}</pre>
        </div>
      )}
    </div>
  )
}

