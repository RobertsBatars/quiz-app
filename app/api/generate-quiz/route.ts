import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { QuizType, QueryResponse, GeneratedQuiz } from '@/types/quiz'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// OpenAI function schemas
const QUERY_FUNCTION = {
  name: 'generate_search_query',
  description: 'Generate a search query to find relevant information for the quiz',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant information'
      },
      stopQuery: {
        type: 'boolean',
        description: 'Whether to stop generating more queries'
      },
      contextSummary: {
        type: 'string',
        description: 'Summary of the context gathered so far'
      }
    },
    required: ['query', 'stopQuery']
  }
} as const

const QUIZ_FUNCTIONS = {
  'multiple-choice': {
    name: 'generate_multiple_choice_quiz',
    description: 'Generate a multiple choice quiz',
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: {
                type: 'array',
                items: { type: 'string' },
                minItems: 4,
                maxItems: 4
              },
              correctAnswer: { type: 'integer' },
              explanation: { type: 'string' }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      },
      required: ['questions']
    }
  },
  'open-ended': {
    name: 'generate_open_ended_quiz',
    description: 'Generate an open-ended quiz with grading rubric',
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              sampleAnswer: { type: 'string' },
              gradingRubric: {
                type: 'object',
                properties: {
                  keyPoints: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  scoringCriteria: { type: 'string' }
                }
              }
            },
            required: ['question', 'sampleAnswer', 'gradingRubric']
          }
        }
      },
      required: ['questions']
    }
  },
  'flash-cards': {
    name: 'generate_flash_cards',
    description: 'Generate flash cards',
    parameters: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              hints: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['front', 'back']
          }
        }
      },
      required: ['cards']
    }
  },
  'oral-exam': {
    name: 'generate_oral_exam',
    description: 'Generate an oral exam structure',
    parameters: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                    expectedPoints: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    followUpQuestions: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['question', 'expectedPoints']
                }
              }
            },
            required: ['topic', 'questions']
          }
        }
      },
      required: ['sections']
    }
  }
} as const

// Mock vector search function - replace with actual vector DB search
async function mockVectorSearch(query: string): Promise<string> {
  // This would be replaced with actual vector DB search
  return `Mock search result for query: ${query}`
}

export async function POST(request: NextRequest) {
  const { content, quizType } = await request.json()

  try {
    // Step 1: Generate queries and gather context
    let contextData: string[] = []
    let queryCount = 0
    const maxQueries = 3

    while (queryCount < maxQueries) {
      const queryCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
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
        functions: [QUERY_FUNCTION],
        function_call: { name: 'generate_search_query' }
      })

      const functionCall = queryCompletion.choices[0].message.function_call
      if (!functionCall || !functionCall.arguments) {
        throw new Error('Failed to generate search query')
      }

      const queryResponse = JSON.parse(functionCall.arguments) as QueryResponse
      const searchResult = await mockVectorSearch(queryResponse.query)
      contextData.push(searchResult)

      if (queryResponse.stopQuery) {
        break
      }

      queryCount++
    }

    // Step 2: Generate quiz based on gathered context
    const quizCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
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
      functions: [QUIZ_FUNCTIONS[quizType as QuizType]],
      function_call: { name: QUIZ_FUNCTIONS[quizType as QuizType].name }
    })

    const functionCall = quizCompletion.choices[0].message.function_call
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Failed to generate quiz')
    }

    const quiz = JSON.parse(functionCall.arguments) as GeneratedQuiz

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Quiz generation failed' },
      { status: 500 }
    )
  }
}

