import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db' // Fix import
import Quiz from '@/models/Quiz'
import Project from '@/models/Project'

// Add these interfaces at the top of the file
interface QuizQuestion {
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  aiRubric?: {
    keyPoints: string[];
    scoringCriteria: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, quizData } = await request.json()
    console.log('📦 Request data:', { 
      projectId, 
      quizType: quizData.type,
      title: quizData.title  // Access title from quizData object
    })

    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No authenticated session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('👤 User:', session.user.id)

    await connectDB()
    console.log('✅ DB connected')

    const project = await Project.findOne({ 
      _id: projectId,
      $or: [{ userId: session.user.id }, { 'collaborators.userId': session.user.id }]
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create new quiz document with title
    const quiz = await Quiz.create({
      userId: session.user.id,
      projectId,
      title: quizData.title,
      type: quizData.type,
      questions: quizData.questions.map((q: QuizQuestion) => ({
        ...q,
        type: quizData.type
      })),
      status: 'draft'
    })

    console.log('✅ Quiz created:', quiz._id)

    return NextResponse.json({
      success: true,
      quiz
    })

  } catch (error) {
    console.error('❌ Quiz creation failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Quiz creation failed' },
      { status: 500 }
    )
  }
}
