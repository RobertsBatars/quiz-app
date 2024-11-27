import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongoose'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('🔍 Connecting to database...')
    await connectToDatabase()

    console.log('🔍 Checking for existing user...')
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user document matching auth expectations
    const userDoc = {
      email,
      name, 
      password: hashedPassword,
      role: 'user',
      status: 'active',
      loginAttempts: 0,
      lockUntil: new Date(0),
      settings: {
        emailNotifications: true,
        twoFactorEnabled: false,
        theme: 'system'
      },
      projects: [] as mongoose.Types.ObjectId[],
      quizzes: [] as mongoose.Types.ObjectId[],
      documents: [] as mongoose.Types.ObjectId[],
      uploadedFiles: [] as mongoose.Types.ObjectId[],
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('📝 Creating user with schema:', JSON.stringify(userDoc, null, 2))

    try {
      const user = await User.create(userDoc)
      console.log('✅ User created successfully')
      console.log('📋 User document:', JSON.stringify(user.toObject(), null, 2))

      // Test credential validation
      const validPassword = await bcrypt.compare(password, user.password)
      console.log('🔑 Password validation:', validPassword)

      // Test user findOne query
      const foundUser = await User.findOne({ email })
      console.log('🔍 User findOne test:', foundUser ? 'Found' : 'Not found')
      if (foundUser) {
        console.log('📋 Found user:', JSON.stringify(foundUser.toObject(), null, 2))
      }

      const { password: _, ...userWithoutPassword } = user.toObject()
      return NextResponse.json(
        { message: 'User created successfully', user: userWithoutPassword },
        { status: 201 }
      )
    } catch (error) {
      console.error('❌ User creation failed:', error)
      if (error instanceof mongoose.Error.ValidationError) {
        console.error('📋 Validation errors:', error.errors)
        Object.keys(error.errors).forEach(field => {
          console.error(`❌ Field '${field}':`, error.errors[field].message)
        })
        return NextResponse.json(
          { error: 'Invalid user data', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('❌ Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}