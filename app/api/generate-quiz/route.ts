import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { QuizType, QueryResponse, GeneratedQuiz } from '@/types/quiz'
import { vectorSearch } from '@/lib/vector'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SearchQuery = z.object({
  query: z.string(),
  stopQuery: z.boolean(),
  contextSummary: z.string().optional()
})

const QUERY_SCHEMA = zodResponseFormat(SearchQuery, 'search_query')

const MultipleChoiceQuestion = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string()
})

const OpenEndedQuestion = z.object({
  question: z.string(),
  sampleAnswer: z.string(),
  gradingRubric: z.object({
    keyPoints: z.array(z.string()),
    scoringCriteria: z.string()
  })
})

const FlashCard = z.object({
  front: z.string(),
  back: z.string(),
  hints: z.array(z.string()).optional()
})

const OralExamQuestion = z.object({
  question: z.string(),
  expectedPoints: z.array(z.string()),
  followUpQuestions: z.array(z.string()).optional()
})

const OralExamSection = z.object({
  topic: z.string(),
  questions: z.array(OralExamQuestion)
})

const QUIZ_SCHEMAS = {
  'multiple-choice': zodResponseFormat(z.object({
    questions: z.array(MultipleChoiceQuestion)
  }), 'multiple_choice_quiz'),
  
  'open-ended': zodResponseFormat(z.object({
    questions: z.array(OpenEndedQuestion)
  }), 'open_ended_quiz'),
  
  'flash-cards': zodResponseFormat(z.object({
    cards: z.array(FlashCard)
  }), 'flash_cards'),
  
  'oral-exam': zodResponseFormat(z.object({
    sections: z.array(OralExamSection)
  }), 'oral_exam')
} as const

export async function POST(request: NextRequest) {
  const { content, quizType, projectId } = await request.json()

  try {
    // Step 1: Generate queries and gather context using vector search
    let contextData: string[] = []
    let queryCount = 0
    const maxQueries = 3

    while (queryCount < maxQueries) {
      const queryCompletion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that generates search queries to gather relevant information for creating quizzes. Analyze the content and generate focused queries.'
          },
          {
            role: 'user',
            content: `Content: ${content}\nContext gathered so far: ${contextData.join('\n')}`
          }
        ],
        response_format: QUERY_SCHEMA
      })

      if (queryCompletion.choices[0].message.refusal) {
        throw new Error('Query generation refused: ' + queryCompletion.choices[0].message.refusal)
      }

      const queryResponse = queryCompletion.choices[0].message.parsed
      const searchResults = await vectorSearch(queryResponse.query, projectId)
      
      for (const result of searchResults) {
        contextData.push(result.content)
      }

      if (queryResponse.stopQuery || contextData.length >= 10) {
        break
      }

      queryCount++
    }

    // Step 2: Generate quiz based on gathered context
    const quizCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are an AI that generates high-quality ${quizType} quizzes. Use the provided context to create an engaging and educational quiz.`
        },
        {
          role: 'user',
          content: `Content: ${content}\nGathered context: ${contextData.join('\n')}`
        }
      ],
      response_format: QUIZ_SCHEMAS[quizType as QuizType]
    })

    if (quizCompletion.choices[0].message.refusal) {
      throw new Error('Quiz generation refused: ' + quizCompletion.choices[0].message.refusal)
    }

    const quiz = quizCompletion.choices[0].message.parsed

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Quiz generation failed' },
      { status: 500 }
    )
  }
}

