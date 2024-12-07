import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Document from '@/models/Document';
import Project from '@/models/Project';
import { connectToDatabase } from '@/lib/mongoose';
import { generateEmbeddings } from '@/lib/embeddings';
import { extractTextFromFile } from '@/lib/documents';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Next.js 13+ App Router handlers must use named exports
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    // Validate inputs
    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large', 
        details: 'Maximum file size is 10MB' 
      }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type', 
        details: 'Supported formats: PDF, DOC, DOCX, TXT' 
      }, { status: 400 });
    }

    // Create unique filename
    const fileName = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', projectId);
    const filePath = path.join(uploadDir, fileName);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Extract text and generate embeddings
    const fileContent = buffer.toString('utf-8');
    const processedChunks = await generateEmbeddings(fileContent);

    // Connect to database
    await connectToDatabase();

    // Create document record
    const document = await Document.create({
      userId: session.user.id,
      projectId: new mongoose.Types.ObjectId(projectId),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      path: filePath,
      chunks: processedChunks.map(chunk => ({
        content: chunk.content,
        embeddings: chunk.embedding
      })),
      status: 'completed',
      moderationStatus: 'pending'
    });

    // Update project
    await Project.findByIdAndUpdate(
      projectId,
      { $push: { documents: document._id } }
    );

    return NextResponse.json({
      success: true,
      documentId: document._id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
