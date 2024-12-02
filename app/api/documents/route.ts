import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'
import Document from '@/models/Document';
import { Types } from 'mongoose';

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