import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Quiz from '@/models/Quiz'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const quizzes = await Quiz.find({
      projectId,
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    }).sort({ createdAt: -1 })

    return NextResponse.json({ success: true, quizzes })

  } catch (error) {
    console.error('Failed to fetch quizzes:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch quizzes' },
      { status: 500 }
    )
  }
}