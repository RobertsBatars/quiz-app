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
    
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embeddings",
          queryVector: await createEmbedding(query),
          numCandidates: 100,
          limit: 5
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
          content: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    return await Document.aggregate(pipeline);
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}