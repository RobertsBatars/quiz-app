import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Document from '@/models/Document';
import { Types } from 'mongoose';
import { writeFile } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db';
import Project from '@/models/Project';
import {
  ensureUploadDir,
  extractTextFromFile,
  generateEmbeddings,
  moderateContent
} from '@/lib/documents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('POST /api/documents - Start');
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'found' : 'not found');
    
    if (!session?.user) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', {
      id: session.user.id,
      email: session.user.email
    });

    await connectDB();
    console.log('Database connected');

    const data = await request.formData();
    console.log('Form data fields:', Array.from(data.keys()));
    
    const file: File | null = data.get('file') as unknown as File;
    const projectId = data.get('projectId');

    if (!file || !projectId) {
      console.error('Missing data:', { file: !!file, projectId: !!projectId });
      return NextResponse.json({ error: 'File or project ID missing' }, { status: 400 });
    }
    
    console.log('File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      projectId
    });

    // Verify project exists and user has access
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId as string),
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    });

    console.log('Project found:', project ? 'yes' : 'no');

    if (!project) {
      console.error(`Project ${projectId} not found or user ${session.user.id} has no access`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('Creating document record...');
    const document = await Document.create({
      userId: session.user.id,
      projectId: new Types.ObjectId(projectId as string),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'processing',
      moderationStatus: 'pending'
    });
    console.log('Document record created:', document._id);

    console.log('Creating upload directory...');
    const uploadDir = await ensureUploadDir(projectId as string);
    console.log('Upload directory:', uploadDir);
    
    const filePath = path.join(uploadDir, `${document._id}_${file.name}`);
    console.log('File path:', filePath);
    
    document.path = filePath;
    await document.save();
    console.log('Document path saved');

    console.log('Writing file...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log('File written successfully');

    console.log('Extracting text content...');
    const content = await extractTextFromFile(filePath, file.type);
    document.content = content;
    console.log('Text content extracted:', content.substring(0, 100) + '...');

    console.log('Moderating content...');
    const moderationResult = await moderateContent(content);
    console.log('Moderation result:', moderationResult);
    
    if (moderationResult.flagged) {
      console.log('Content flagged by moderation');
      document.moderationStatus = 'rejected';
      document.moderationReason = moderationResult.reason;
      document.status = 'error';
      await document.save();
      return NextResponse.json({
        error: 'Content flagged by moderation system',
        reason: moderationResult.reason
      }, { status: 400 });
    }

    console.log('Generating embeddings...');
    const embeddings = await generateEmbeddings(content);
    console.log('Embeddings generated, length:', embeddings.length);
    
    document.embeddings = embeddings;
    document.moderationStatus = 'approved';
    document.status = 'completed';
    await document.save();
    console.log('Document processing completed');

    return NextResponse.json({
      success: true,
      document: {
        id: document._id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status,
        moderationStatus: document.moderationStatus,
        uploadDate: document.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing document:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'CastError') {
        return NextResponse.json({
          error: 'Invalid project ID format'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      error: 'Failed to process document'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('GET /api/documents - Start');
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'found' : 'not found');
    
    if (!session?.user) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', {
      id: session.user.id,
      email: session.user.email
    });

    await connectDB();
    console.log('Database connected');

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    console.log('Project ID from query:', projectId);

    if (!projectId) {
      console.error('No project ID provided');
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists and user has access
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      $or: [
        { userId: session.user.id },
        { 'collaborators.userId': session.user.id }
      ]
    });

    console.log('Project found:', project ? 'yes' : 'no');

    if (!project) {
      console.error(`Project ${projectId} not found or user ${session.user.id} has no access`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const documents = await Document.find({
      projectId: new Types.ObjectId(projectId),
      userId: session.user.id
    })
    .select('fileName fileType fileSize status moderationStatus moderationReason createdAt')
    .sort('-createdAt')
    .lean();

    console.log(`Found ${documents.length} documents for project ${projectId}`);

    return NextResponse.json({ 
      success: true,
      documents: documents.map(doc => ({
        id: doc._id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status,
        moderationStatus: doc.moderationStatus,
        moderationReason: doc.moderationReason,
        uploadDate: doc.createdAt || doc.uploadDate
      }))
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'CastError') {
        return NextResponse.json({
          success: false,
          error: 'Invalid project ID format'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents'
    }, { status: 500 });
  }
}