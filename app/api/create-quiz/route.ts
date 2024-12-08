import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Quiz from '@/models/Quiz';
import Project from '@/models/Project';
import mongoose from 'mongoose';

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
    const { projectId, quizData } = await request.json();
    console.log('📦 Request data:', {
      projectId,
      quizType: quizData.type,
      title: quizData.title,
    });

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log('❌ No authenticated session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('👤 User:', session.user.id);

    await connectDB();
    console.log('✅ DB connected');

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id },
      ],
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create a new Quiz instance
    const quiz = new Quiz({
      userId: session.user.id,
      projectId,
      title: quizData.title,
      type: quizData.type,
      status: 'draft',
      // Add questions directly here
      questions: quizData.questions.map((q: QuizQuestion) => ({
        question: q.question,
        type: quizData.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        aiRubric: q.aiRubric,
      })),
    });

    // Save the quiz to the database
    await quiz.save();

    console.log('✅ Quiz created:', quiz._id);

    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error('❌ Quiz creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Quiz creation failed',
      },
      { status: 500 }
    );
  }
}
