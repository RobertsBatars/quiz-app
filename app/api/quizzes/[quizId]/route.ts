import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Quiz from '@/models/Quiz'

export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const quiz = await Quiz.findOne({
      _id: params.quizId,
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, quiz })

  } catch (error) {
    console.error('Failed to fetch quiz:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch quiz' },
      { status: 500 }
    )
  }
}