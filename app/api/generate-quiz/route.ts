import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { QuizType, QueryResponse, GeneratedQuiz } from '@/types/quiz'
import { vectorSearch } from '@/lib/vector'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import Document from '@/models/Document' // Fix: import default export
import connectDB from '@/lib/db' // Add DB connection
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// Ensure database connection
dbConnect();

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
  options: z.array(z.string()), // No length constraint
  correctAnswer: z.string(), // Change to string instead of number with min/max
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
  console.log('🚀 Starting quiz generation...')
  const { content, quizType, projectId, customInstructions, questionCount = 5, title } = await request.json()
  console.log('📦 Request data:', { quizType, projectId, questionCount })

  try {
    await connectDB()
    console.log('✅ DB connected')

    const existingDoc = await Document.findOne({ projectId }).exec()
    console.log('📄 Found documents:', !!existingDoc)

    let queryResponses: any[] = []
    let documentContexts: Array<{ content: string, fileName: string }> = []

    if (existingDoc) {
      console.log('🔄 Gathering context...')
      let queryCount = 0
      const maxQueries = 5

      while (queryCount < maxQueries) {
        console.log(`📝 Generating query ${queryCount + 1}/${maxQueries}`)
        const queryCompletion = await openai.beta.chat.completions.parse({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI that generates focused search queries to find relevant context for quiz generation.'
            },
            {
              role: 'user',
              content: `Generate a search query for a ${quizType} quiz about: ${title}`
            }
          ],
          response_format: QUERY_SCHEMA
        })

        queryResponses.push(queryCompletion.choices[0].message.parsed)
        
        const searchResults = await vectorSearch(
          queryCompletion.choices[0].message?.parsed?.query ?? '', 
          projectId
        )

        documentContexts.push(...searchResults.map(r => ({
          content: r.content,
          fileName: r.fileName
        })))

        if (queryCompletion.choices[0].message?.parsed?.stopQuery || documentContexts.length >= 10) {
          break
        }
        queryCount++
      }
    }

    console.log('📚 Generating quiz...')
    const quizCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI that generates high-quality ${quizType} quizzes. Generate exactly ${questionCount} questions. ${customInstructions || ''}`
        },
        {
          role: 'user',
          content: documentContexts.length > 0 
            ? `Title: ${title}\nContent: ${documentContexts.map(d => d.content).join('\n')}\nSource Files: ${documentContexts.map(d => d.fileName).join(', ')}`
            : `Title: ${title}`
        }
      ],
      response_format: QUIZ_SCHEMAS[quizType as QuizType]
    })

    const quiz = quizCompletion.choices[0].message.parsed
    if (!quiz) {
      throw new Error('Failed to generate quiz - no data received')
    }

    return NextResponse.json({ success: true, quiz })

  } catch (error) {
    console.error('❌ Quiz generation failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Quiz generation failed' },
      { status: 500 }
    )
  }
}
