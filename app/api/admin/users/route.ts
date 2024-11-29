import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import User from '@/models/User'
import Quiz from '@/models/Quiz'
import Response from '@/models/Response'
import dbConnect from '@/lib/mongodb'
import connectDB from '@/lib/db'  // Add this import

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect

    const users = await User.find({}, {
      password: 0,
      __v: 0
    }).sort({ createdAt: -1 })

    const userStats = await Promise.all(users.map(async (user) => {
      const quizCount = await Quiz.countDocuments({ userId: user._id })
      const quizScores = await Response.find({ userId: user._id }, { totalScore: 1 })
      const averageScore = quizScores.length > 0
        ? quizScores.reduce((acc, curr) => acc + curr.totalScore, 0) / quizScores.length
        : 0

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
        quizzesTaken: quizCount,
        averageScore: Math.round(averageScore),
        createdAt: user.createdAt
      }
    }))

    return NextResponse.json({ users: userStats })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action } = await request.json()
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot modify admin users' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'ban':
        user.status = 'banned'
        break
      case 'unban':
        user.status = 'active'
        break
      case 'delete':
        await User.findByIdAndDelete(userId)
        return NextResponse.json({ success: true })
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    await user.save()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}