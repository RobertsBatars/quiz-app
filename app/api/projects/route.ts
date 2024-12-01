import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Project from '@/models/Project'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions)
    if (!authSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Start MongoDB session
    const mongoSession = await mongoose.startSession()
    mongoSession.startTransaction()

    try {
      const body = await request.json()
      
      const projectDoc = {
        userId: authSession.user.id,
        name: body.name,
        description: '',
        documents: [],
        quizzes: [],
        collaborators: [],
        settings: {
          isPublic: false,
          allowComments: true,
          documentLimit: 100
        },
        status: 'active'
      }

      // Create project within transaction
      const [project] = await Project.create([projectDoc], { session: mongoSession })
      
      // Update user's projects array
      await User.findByIdAndUpdate(
        authSession.user.id,
        { $push: { projects: project._id } },
        { session: mongoSession }
      )

      await mongoSession.commitTransaction()
      
      return NextResponse.json({ success: true, project })
    } catch (error) {
      await mongoSession.abortTransaction()
      throw error
    } finally {
      mongoSession.endSession()
    }

  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const projects = await Project.find({ 
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    })

    return NextResponse.json({ 
      success: true,
      projects: projects.map(p => ({
        id: p._id,
        name: p.name,
        userId: p.userId
      }))
    })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}