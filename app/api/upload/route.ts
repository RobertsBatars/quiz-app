import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const data = await request.formData()
  const file: File | null = data.get('file') as unknown as File
  const projectId = data.get('projectId')

  if (!file || !projectId) {
    return NextResponse.json({ success: false, error: 'File or project ID missing' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // In a real app, you'd store files in a cloud storage service
  // For this example, we'll store them locally
  const uploadDir = path.join(process.cwd(), 'uploads', projectId as string)
  const filePath = path.join(uploadDir, file.name)

  try {
    await writeFile(filePath, buffer)

    // Read the file content for moderation
    const content = await readFile(filePath, 'utf-8')

    // Moderate the content
    const moderation = await openai.moderations.create({ input: content })

    if (moderation.results[0].flagged) {
      // If the content is flagged, delete the file and return an error
      await unlink(filePath)
      return NextResponse.json({ success: false, error: 'Content flagged by moderation system' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('File processing failed:', error)
    return NextResponse.json({ success: false, error: 'File processing failed' }, { status: 500 })
  }
}

