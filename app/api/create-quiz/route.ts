import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { projectId, quizType, questionAmount, customInstructions } = await request.json()

  try {
    // For now, we'll use mock data instead of calling OpenAI
    const mockQuiz = {
      id: `${quizType}-${Date.now()}`,
      projectId,
      type: quizType,
      questions: Array.from({ length: questionAmount }, (_, i) => ({
        id: `q${i + 1}`,
        text: `This is a mock ${quizType} question ${i + 1}`,
        options: quizType === 'multiple-choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
        answer: quizType === 'multiple-choice' ? 'Option A' : 'This is a mock answer',
      })),
    }

    // Uncomment the following code to use OpenAI when ready
    /*
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that generates ${quizType} quizzes. Generate ${questionAmount} questions. ${customInstructions}`
        },
        {
          role: "user",
          content: "Generate the quiz now."
        }
      ],
    })

    const generatedQuiz = completion.choices[0].message.content
    */

    return NextResponse.json({ success: true, quiz: mockQuiz })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json({ success: false, error: 'Quiz generation failed' }, { status: 500 })
  }
}

