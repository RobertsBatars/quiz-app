import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import connectDB from '@/lib/db' // Fix import
import Quiz from '@/models/Quiz'
import Project from '@/models/Project'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { projectId, quizData } = await request.json()

    // Validate project access
    const project = await Project.findOne({ 
      _id: projectId,
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create quiz in database
    const quiz = await Quiz.create({
      userId: session.user.id,
      projectId: project._id,
      ...quizData
    })

    // Add quiz to project
    await Project.updateOne(
      { _id: project._id },
      { $push: { quizzes: quiz._id } }
    )

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Quiz creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create quiz' }, 
      { status: 500 }
    )
  }
}
