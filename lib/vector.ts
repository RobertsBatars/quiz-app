import { connectToDatabase } from '@/lib/mongoose';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import Document from '@/models/Document';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

export async function vectorSearch(query: string, projectId: string) {
  try {
    await connectToDatabase();
    
    console.log('🔍 Vector search params:', { query, projectId });
    
    const queryVector = await createEmbedding(query);
    console.log('✅ Generated query embedding');

    const pipeline = [
      {
        $match: {
          projectId: new Types.ObjectId(projectId),
          status: "completed",
          moderationStatus: "approved"
        }
      },
      { $unwind: "$chunks" },
      {
        $vectorSearch: {
          index: "vector_index",
          path: "chunks.embeddings",
          queryVector,
          numCandidates: 100,
          limit: 5
        }
      },
      {
        $project: {
          fileName: 1,
          chunk: "$chunks.content",
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    console.log('📊 Running aggregation pipeline...');
    const results = await Document.aggregate(pipeline);
    
    return results;
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}