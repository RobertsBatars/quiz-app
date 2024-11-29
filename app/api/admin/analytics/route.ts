import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import User from '@/models/User'
import Quiz from '@/models/Quiz'
import Response from '@/models/Response'
import Document from '@/models/Document'
import connectDB from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB

    // Get monthly analytics for the last 6 months
    const now = new Date()
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6))

    const monthlyStats = await Response.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          averageScore: { $avg: '$totalScore' },
          totalResponses: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Get user registrations by month
    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Get quiz creation stats by month
    const quizStats = await Quiz.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newQuizzes: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Get overall statistics
    const totalUsers = await User.countDocuments()
    const totalQuizzes = await Quiz.countDocuments()
    const totalFiles = await Document.countDocuments()
    const averageScore = await Response.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: '$totalScore' }
        }
      }
    ])

    // Combine monthly stats
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const analytics = monthlyStats.map(stat => {
      const userStat = userStats.find(u => 
        u._id.year === stat._id.year && u._id.month === stat._id.month
      )
      const quizStat = quizStats.find(q => 
        q._id.year === stat._id.year && q._id.month === stat._id.month
      )

      return {
        name: months[stat._id.month - 1],
        users: userStat?.newUsers || 0,
        quizzes: quizStat?.newQuizzes || 0,
        averageScore: Math.round(stat.averageScore || 0),
        responses: stat.totalResponses
      }
    })

    return NextResponse.json({
      analytics,
      overall: {
        totalUsers,
        totalQuizzes,
        totalFiles,
        averageScore: Math.round(averageScore[0]?.average || 0)
      }
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}