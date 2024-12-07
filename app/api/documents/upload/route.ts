import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import Document from '@/models/Document';
import Project from '@/models/Project';
import { connectToDatabase } from '@/lib/mongoose';
import { generateEmbeddings } from '@/lib/embeddings';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Add types at the top
interface PDFText {
  R: Array<{ T: string }>;
}

interface PDFPage {
  Texts: PDFText[];
}

interface PDFData {
  Pages: PDFPage[];
}

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

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
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

    // Save file and extract text
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let fileContent = '';

    // Update PDF parsing section
    if (file.type === 'application/pdf') {
      try {
        // Import pdf2json
        const PDFParser = (await import('pdf2json')).default;
        const pdfParser = new PDFParser();

        // Create a promise to handle parsing with type
        const parsePromise = new Promise<PDFData>((resolve, reject) => {
          pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
            resolve(pdfData);
          });
          // Fix the error typing here
          pdfParser.on('pdfParser_dataError', (errMsg: { parserError: Error }) => {
            reject(new Error(errMsg.parserError.message));
          });
        });

        // Parse PDF buffer
        pdfParser.parseBuffer(buffer);
        const pdfData = await parsePromise;
        
        // Convert PDF data to text with type safety
        fileContent = decodeURIComponent(
          pdfData.Pages?.map(page => 
            page.Texts?.map(text => 
              text.R?.[0]?.T || ''
            ).join(' ') || ''
          ).join('\n') || ''
        );

        if (!fileContent) {
          return NextResponse.json({
            success: false,
            error: 'Could not extract text from PDF'
          }, { status: 400 });
        }

        console.log('📄 PDF parsed successfully:', {
          pages: pdfData.Pages?.length,
          contentLength: fileContent.length,
          preview: fileContent.slice(0, 100)
        });

      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json({
          success: false,
          error: 'Failed to parse PDF file',
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      fileContent = buffer.toString('utf-8');
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text content could be extracted from file'
      }, { status: 400 });
    }

    try {
      // Save file
      const fileName = `${Date.now()}-${file.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', projectId);
      const filePath = path.join(uploadDir, fileName);
      await mkdir(uploadDir, { recursive: true });
      await writeFile(filePath, buffer);

      // Connect to database first
      await connectToDatabase();

      // Start MongoDB session for transaction
      const mongoSession = await mongoose.startSession();
      mongoSession.startTransaction();

      try {
        // Create document record
        const document = await Document.create([{
          userId: session.user.id,
          projectId: new mongoose.Types.ObjectId(projectId),
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          path: filePath,
          status: 'processing', // Set initial status to processing
          moderationStatus: 'pending'
        }], { session: mongoSession });

        // Generate and store embeddings
        await generateEmbeddings(fileContent, document[0]._id.toString(), projectId);

        // Update document status to completed
        await Document.findByIdAndUpdate(
          document[0]._id,
          { status: 'completed' },
          { session: mongoSession }
        );

        await mongoSession.commitTransaction();

        console.log('✅ Document and embeddings created:', {
          documentId: document[0]._id,
          fileName: document[0].fileName
        });

        return NextResponse.json({
          success: true,
          documentId: document[0]._id
        });

      } catch (error) {
        await mongoSession.abortTransaction();
        throw error;
      } finally {
        await mongoSession.endSession();
      }

    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json({
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
