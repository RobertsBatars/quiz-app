import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { content, quizType } = await request.json()

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that generates ${quizType} quizzes based on provided content. Generate 5 questions.`
        },
        {
          role: "user",
          content: content
        }
      ],
    })

    const quiz = completion.choices[0].message.content

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json({ success: false, error: 'Quiz generation failed' })
  }
}

