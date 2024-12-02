import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Document from '@/models/Document';
import { Types } from 'mongoose';
import { 
  ensureUploadDir, 
  extractTextFromFile, 
  generateEmbeddings, 
  moderateContent 
} from '@/lib/documents';
import { connectToDatabase } from '@/lib/mongoose';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Next.js 13+ App Router handlers must use named exports
export async function POST(request: NextRequest) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', details: 'Maximum file size is 10MB' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', details: 'Supported formats: PDF, DOC, DOCX, TXT' },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = await ensureUploadDir(projectId);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Connect to database
    await connectToDatabase();

    // Create document record
    const document = new Document({
      userId: session.user.id,
      projectId: new Types.ObjectId(projectId),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      path: filePath,
      status: 'processing'
    });

    await document.save();

    // Process document in background
    processDocument(document._id.toString(), filePath, file.type).catch(console.error);

    return NextResponse.json({
      success: true,
      documentId: document._id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function processDocument(documentId: string, filePath: string, fileType: string) {
  try {
    const text = await extractTextFromFile(filePath, fileType);
    const moderation = await moderateContent(text);
    const embeddings = moderation.flagged ? [] : await generateEmbeddings(text);

    await Document.findByIdAndUpdate(documentId, {
      content: text,
      embeddings,
      status: 'completed',
      moderationStatus: moderation.flagged ? 'rejected' : 'approved',
      moderationReason: moderation.reason
    });

  } catch (error) {
    console.error('Processing error:', error);
    await Document.findByIdAndUpdate(documentId, {
      status: 'error',
      moderationReason: (error as Error).message
    });
  }
}
