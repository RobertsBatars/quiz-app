import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { projectId, quizType, questionAmount, customInstructions } = await request.json()

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that generates ${quizType} quizzes. Generate ${questionAmount} questions in JSON format with the following structure:
          {
            "questions": [
              {
                "id": "string",
                "text": "string",
                "options": ["string"] (for multiple-choice only),
                "answer": "string",
                "explanation": "string"
              }
            ]
          }
          ${customInstructions}`
        },
        {
          role: "user",
          content: "Generate the quiz now."
        }
      ],
      response_format: { type: "json_object" }
    })

    const generatedQuiz = JSON.parse(completion.choices[0].message.content)
    const quiz = {
      id: `${quizType}-${Date.now()}`,
      projectId,
      type: quizType,
      questions: generatedQuiz.questions
    }

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json({ success: false, error: 'Quiz generation failed' }, { status: 500 })
  }
}

