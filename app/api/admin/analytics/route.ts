import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import User from '@/models/User'
import Quiz from '@/models/Quiz'
import Response from '@/models/Response'
import Document from '@/models/Document'
import { connectToDatabase } from '@/lib/mongoose'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    console.log('DB connected')

    // Get monthly analytics for the last 6 months
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    const currentYear = now.getFullYear()
    
    // Initialize array for the last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const analytics = []

    // Calculate correct date range
    for (let i = 5; i >= 0; i--) {
      let monthIndex = currentMonth - i
      let year = currentYear
      
      if (monthIndex < 0) {
        monthIndex += 12
        year -= 1
      }
      
      analytics.push({
        name: months[monthIndex],
        year: year,
        month: monthIndex + 1, // MongoDB months are 1-12
        users: 0,
        quizzes: 0,
        responses: 0,
        averageScore: 0
      })
    }

    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 5) // -5 to include current month
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Rest of the aggregation queries...
    const [monthlyStats, userStats, quizStats, totalUsers, totalQuizzes, totalFiles, averageScore] = await Promise.all([
      Response.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
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
        }
      ]),
      User.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newUsers: { $sum: 1 }
          }
        }
      ]),
      Quiz.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newQuizzes: { $sum: 1 }
          }
        }
      ]),
      User.countDocuments(),
      Quiz.countDocuments(),
      Document.countDocuments(),
      Response.aggregate([
        {
          $group: {
            _id: null,
            average: { $avg: '$totalScore' }
          }
        }
      ])
    ])

    // Update the data merging logic
    monthlyStats.forEach(stat => {
      const analyticsIndex = analytics.findIndex(a => 
        a.year === stat._id.year && a.month === stat._id.month
      )
      if (analyticsIndex !== -1) {
        analytics[analyticsIndex].responses = stat.totalResponses
        analytics[analyticsIndex].averageScore = Math.round(stat.averageScore || 0)
      }
    })

    userStats.forEach(stat => {
      const analyticsIndex = analytics.findIndex(a => 
        a.year === stat._id.year && a.month === stat._id.month
      )
      if (analyticsIndex !== -1) {
        analytics[analyticsIndex].users = stat.newUsers
      }
    })

    quizStats.forEach(stat => {
      const analyticsIndex = analytics.findIndex(a => 
        a.year === stat._id.year && a.month === stat._id.month
      )
      if (analyticsIndex !== -1) {
        analytics[analyticsIndex].quizzes = stat.newQuizzes
      }
    })

    const overall = {
      totalUsers,
      totalQuizzes,
      totalFiles,
      averageScore: Math.round(averageScore[0]?.average || 0)
    }

    // Clean up the analytics data before sending
    const cleanAnalytics = analytics.map(({ name, users, quizzes, responses, averageScore }) => ({
      name,
      users,
      quizzes,
      responses,
      averageScore
    }))

    console.log('Analytics data:', { analytics: cleanAnalytics, overall })
    return NextResponse.json({ analytics: cleanAnalytics, overall })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}