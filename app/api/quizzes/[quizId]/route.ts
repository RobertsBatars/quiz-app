import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db';
import Quiz from '@/models/Quiz';

export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB();

    const quiz = await Quiz.findById(params.quizId).lean(); // Use lean() for plain JavaScript objects

    if (!quiz) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quiz not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, quiz }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}