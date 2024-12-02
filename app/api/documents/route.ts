import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'
import Document from '@/models/Document';
import { Types } from 'mongoose';
import { writeFile } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/db';
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
    console.log('Connecting to MongoDB...');
    await dbConnect();
    console.log('MongoDB connected');
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Getting form data...');
    const data = await request.formData();
    console.log('Form data fields:', Array.from(data.keys()));
    
    const file: File | null = data.get('file') as unknown as File;
    const projectId = data.get('projectId');

    if (!file || !projectId) {
      console.log('Missing data:', { file: !!file, projectId: !!projectId });
      return NextResponse.json({ success: false, error: 'File or project ID missing' }, { status: 400 });
    }
    
    console.log('File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      projectId
    });

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
        success: false,
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
      documentId: document._id
    });
  } catch (error) {
    console.error('File processing failed:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json({
      success: false,
      error: 'File processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const query = searchParams.get('query');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    let documents;
    if (query) {
      // If query is provided, use vector search
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: query,
        }),
      });

      const embeddings = (await response.json()).data[0].embedding;

      documents = await Document.aggregate([
        {
          $vectorSearch: {
            queryVector: embeddings,
            path: "embeddings",
            numCandidates: 10,
            limit: 5,
            index: "vector_index",
          }
        },
        {
          $match: {
            projectId: new Types.ObjectId(projectId),
            status: "completed",
            moderationStatus: "approved"
          }
        },
        {
          $project: {
            fileName: 1,
            fileType: 1,
            fileSize: 1,
            status: 1,
            moderationStatus: 1,
            moderationReason: 1,
            uploadDate: "$createdAt",
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);
    } else {
      // If no query, return all documents for the project
      documents = await Document.find({
        projectId: new Types.ObjectId(projectId),
        userId: session.user.id,
      }).select('fileName fileType fileSize status moderationStatus moderationReason createdAt')
        .sort('-createdAt');
    }

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        ...doc.toObject(),
        uploadDate: doc.createdAt || doc.uploadDate,
      }))
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}