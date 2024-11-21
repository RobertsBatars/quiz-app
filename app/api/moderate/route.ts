import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const { content } = await request.json()

  try {
    const moderation = await openai.moderations.create({ input: content })

    const isFlagged = moderation.results[0].flagged
    const categories = moderation.results[0].categories

    return NextResponse.json({ success: true, isFlagged, categories })
  } catch (error) {
    console.error('Moderation failed:', error)
    return NextResponse.json({ success: false, error: 'Moderation failed' })
  }
}

