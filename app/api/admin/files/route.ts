import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import Document from '@/models/Document'
import User from '@/models/User'
import connectDB from '@/lib/mongodb'
import { unlink } from 'fs/promises'
import path from 'path'


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB

    const files = await Document.find()
      .populate('userId', 'name email')
      .sort({ uploadDate: -1 })

    const fileStats = files.map(file => ({
      id: file._id,
      name: file.fileName,
      uploadedBy: file.userId.name,
      userEmail: file.userId.email,
      size: file.fileSize,
      type: file.fileType,
      uploadDate: file.uploadDate,
      status: file.status,
      moderationStatus: file.moderationStatus
    }))

    return NextResponse.json({ files: fileStats })
  } catch (error) {
    console.error('Failed to fetch files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await request.json()
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      )
    }

    await connectDB

    const file = await Document.findById(fileId)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete the physical file
    try {
      await unlink(file.path)
    } catch (error) {
      console.error('Failed to delete physical file:', error)
    }

    // Delete the database record
    await Document.findByIdAndDelete(fileId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
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

    const { fileId, action } = await request.json()
    if (!fileId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await connectDB

    const file = await Document.findById(fileId)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'approve':
        file.moderationStatus = 'approved'
        break
      case 'reject':
        file.moderationStatus = 'rejected'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    await file.save()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update file:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}