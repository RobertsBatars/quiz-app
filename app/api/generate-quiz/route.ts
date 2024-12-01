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
  const { content, quizType, projectId, customInstructions, questionCount = 5 } = await request.json()
  console.log('📦 Request data:', { quizType, projectId, questionCount })

  try {
    await connectDB()
    console.log('✅ DB connected')

    const existingDoc = await Document.findOne({ projectId }).exec()
    console.log('📄 Found documents:', !!existingDoc)

    let contextData: string[] = []
    let queryResponses: any[] = []

    if (existingDoc) {
      console.log('🔄 Gathering context...')
      let queryCount = 0
      const maxQueries = 3

      while (queryCount < maxQueries) {
        console.log(`📝 Generating query ${queryCount + 1}/${maxQueries}`)
        const queryCompletion = await openai.beta.chat.completions.parse({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content: 'You are an AI that generates search queries...'
            },
            {
              role: 'user',
              content: `Content: ${content}\nContext: ${contextData.join('\n')}`
            }
          ],
          response_format: QUERY_SCHEMA
        })

        console.log('🤖 OpenAI response:', {
          status: queryCompletion.choices[0].finish_reason,
          refusal: queryCompletion.choices[0].message.refusal
        })

        queryResponses.push(queryCompletion.choices[0].message.parsed)
        console.log('✅ Query response:', queryCompletion.choices[0].message.parsed)

        const searchResults = await vectorSearch(
          queryCompletion.choices[0].message?.parsed?.query ?? '', 
          projectId
        )
        console.log('🔍 Search results:', searchResults.length)

        contextData.push(...searchResults.map(r => r.content))
        if (queryCompletion.choices[0].message?.parsed?.stopQuery || contextData.length >= 10) {
          break
        }
        queryCount++
      }
    }

    console.log('📚 Generating quiz...')
    const quizCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are an AI that generates high-quality ${quizType} quizzes. Generate exactly ${questionCount} questions. ${customInstructions || ''}`
        },
        {
          role: 'user',
          content: contextData.length > 0 
            ? `Content: ${content}\nContext: ${contextData.join('\n')}`
            : `Content: ${content}`
        }
      ],
      response_format: QUIZ_SCHEMAS[quizType as QuizType]
    })

    console.log('🤖 Quiz generation response:', {
      status: quizCompletion.choices[0].finish_reason,
      refusal: quizCompletion.choices[0].message.refusal
    })

    const quiz = quizCompletion.choices[0].message.parsed
    if (!quiz) {
      throw new Error('Failed to generate quiz - no data received')
    }
    console.log('✅ Generated quiz structure:', {
      type: quizType,
      questionCount: 'questions' in quiz ? quiz.questions.length 
                    : 'cards' in quiz ? quiz.cards.length 
                    : 'sections' in quiz ? quiz.sections.length 
                    : 0
    })

    return NextResponse.json({ success: true, quiz })

  } catch (error) {
    console.error('❌ Quiz generation failed:', error)
    if (error instanceof Error) {
      console.error('- Name:', error.name)
      console.error('- Message:', error.message)
      console.error('- Stack:', error.stack)
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Quiz generation failed' },
      { status: 500 }
    )
  }
}
