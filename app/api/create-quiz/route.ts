import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
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
    console.log('🚀 Starting quiz creation...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No authenticated session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('👤 User:', session.user.id)

    await connectDB()
    console.log('✅ DB connected')

    const { projectId, quizData } = await request.json()
    console.log('📦 Request data:', { projectId, quizType: quizData.type })

    const project = await Project.findOne({ 
      _id: projectId,
      $or: [{ userId: session.user.id }, { 'collaborators.userId': session.user.id }]
    })

    if (!project) {
      console.log('❌ Project not found:', projectId)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    console.log('📁 Project found:', project._id)

    // Log raw questions data
    console.log('📝 Raw questions data:', typeof quizData.questions, quizData.questions)

    // Parse and validate questions with detailed logging
    let parsedQuestions = quizData.questions
    if (typeof quizData.questions === 'string') {
      try {
        parsedQuestions = JSON.parse(quizData.questions)
      } catch (parseError) {
        console.error('❌ Question parsing failed:', parseError)
        throw parseError
      }
    }
    console.log('✅ Questions parsed successfully')

    // Log parsed questions structure
    console.log('📋 Parsed questions structure:', 
      parsedQuestions.map((q: any, i: number) => ({
        index: i,
        hasQuestion: !!q.question,
        questionType: typeof q.question,
        hasOptions: Array.isArray(q.options),
        optionsLength: q.options?.length,
        correctAnswerType: typeof q.correctAnswer,
        correctAnswer: q.correctAnswer
      }))
    )

    // Create quiz with detailed error logging
    try {
      const quiz = await Quiz.create({
        userId: session.user.id,
        projectId,
        title: quizData.title,
        type: quizData.type,
        questions: parsedQuestions.map((q: QuizQuestion) => {
          const mappedQuestion = {
            question: q.question,
            type: quizData.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            aiRubric: q.aiRubric || { keyPoints: [], scoringCriteria: '' }
          }
          console.log('🔄 Mapped question:', mappedQuestion)
          return mappedQuestion
        }),
        status: quizData.status || 'draft'
      })
      console.log('✅ Quiz created:', quiz._id)

      // Update project with new quiz
      await Project.findByIdAndUpdate(
        projectId,
        { $push: { quizzes: quiz._id } },
        { new: true }
      )
      console.log('✅ Project updated with new quiz')

      return NextResponse.json({ success: true, quiz })
    } catch (dbError: any) {
      console.error('❌ DB Error details:')
      console.error('- Name:', dbError.name)
      console.error('- Message:', dbError.message)
      console.error('- Validation errors:', dbError.errors)
      if (dbError.errors) {
        Object.keys(dbError.errors).forEach(key => {
          console.error(`- ${key}:`, {
            kind: dbError.errors[key].kind,
            path: dbError.errors[key].path,
            value: dbError.errors[key].value,
            reason: dbError.errors[key].reason
          })
        })
      }
      throw dbError
    }
  } catch (error) {
    console.error('❌ Quiz creation failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create quiz' },
      { status: 500 }
    )
  }
}
