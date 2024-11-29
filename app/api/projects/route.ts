import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Project from '@/models/Project'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Authentication failed: No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    try {
      await connectDB()
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }

    const body = await request.json()
    if (!body.name) {
      console.error('❌ Validation failed: Missing project name')
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const projectDoc = {
      userId: session.user.id,
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

    console.log('📝 Creating project with schema:', JSON.stringify(projectDoc, null, 2))

    try {
      const project = await Project.create(projectDoc)
      console.log('✅ Project created successfully:', project._id)
      
      return NextResponse.json({ success: true, project })
    } catch (dbError: any) {
      // Detailed error logging similar to auth routes
      console.error('❌ Project creation failed with error:', {
        name: dbError.name,
        code: dbError.code,
        message: dbError.message,
        validationErrors: dbError.errors,
        schemaErrors: dbError.errInfo?.details?.schemaRulesNotSatisfied?.[0],
        fullError: JSON.stringify(dbError, null, 2)
      })

      if (dbError instanceof mongoose.Error.ValidationError) {
        // Log each validation error separately
        Object.keys(dbError.errors).forEach(field => {
          console.error(`❌ Field '${field}':`, dbError.errors[field].message)
        })
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid project data',
            details: Object.fromEntries(
              Object.entries(dbError.errors).map(([key, error]) => [
                key, 
                error.message
              ])
            )
          },
          { status: 400 }
        )
      }

      // MongoDB schema validation errors
      if (dbError.code === 121) {
        return NextResponse.json({
          success: false,
          error: 'Schema validation failed',
          details: dbError.errInfo?.details?.schemaRulesNotSatisfied?.[0]
        }, { status: 400 })
      }

      throw dbError
    }
  } catch (error) {
    console.error('❌ Unhandled error in POST /api/projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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