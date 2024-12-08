import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, action, name, email } = body

    await connectDB()

    // Handle admin actions
    if (session.user.role === 'admin' && userId && action) {
      const targetUser = await User.findById(userId)
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      if (targetUser.role === 'admin') {
        return NextResponse.json(
          { error: 'Cannot modify admin users' },
          { status: 403 }
        )
      }

      switch (action) {
        case 'ban':
          targetUser.status = 'banned'
          break
        case 'unban':
          targetUser.status = 'active'
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

      await targetUser.save()
      return NextResponse.json({ success: true })
    }
    
    // Handle profile updates
    if (name || email) {
      // Verify email uniqueness if email is being updated
      if (email && email !== session.user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 400 }
          )
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        session.user.id,
        { 
          ...(name && { name }),
          ...(email && { email })
        },
        { new: true }
      )

      if (!updatedUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ 
        success: true,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}