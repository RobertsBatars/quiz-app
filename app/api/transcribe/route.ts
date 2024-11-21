import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // For now, we'll use mock data instead of calling OpenAI
    const mockTranscription = "This is a mock transcription of the audio file."

    // Uncomment the following code to use OpenAI when ready
    /*
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    })
    */

    return NextResponse.json({ text: mockTranscription })
  } catch (error) {
    console.error('Transcription failed:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}

