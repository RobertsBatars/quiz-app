import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'
import Document from '@/models/Document';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import {
  ensureUploadDir,
  extractTextFromFile,
  generateEmbeddings,
  moderateContent
} from '@/lib/documents';

export const POST = async (request: NextRequest) => {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const projectId = data.get('projectId');

    if (!file || !projectId) {
      return NextResponse.json({ success: false, error: 'File or project ID missing' }, { status: 400 });
    }

    // Create document record in processing state
    const document = await Document.create({
      userId: session.user.id,
      projectId: new Types.ObjectId(projectId as string),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'processing',
      moderationStatus: 'pending'
    });

    // Ensure upload directory exists and save file
    const uploadDir = await ensureUploadDir(projectId as string);
    const filePath = path.join(uploadDir, `${document._id}_${file.name}`);
    document.path = filePath;
    await document.save();

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Extract text content
    const content = await extractTextFromFile(filePath, file.type);
    document.content = content;

    // Moderate content
    const moderationResult = await moderateContent(content);
    if (moderationResult.flagged) {
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

    // Generate embeddings
    const embeddings = await generateEmbeddings(content);
    document.embeddings = embeddings;
    document.moderationStatus = 'approved';
    document.status = 'completed';
    await document.save();

    return NextResponse.json({
      success: true,
      documentId: document._id
    });
  } catch (error) {
    console.error('File processing failed:', error);
    return NextResponse.json({
      success: false,
      error: 'File processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

