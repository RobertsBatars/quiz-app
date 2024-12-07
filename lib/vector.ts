import { connectToDatabase } from '@/lib/mongoose';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import Document from '@/models/Document';
import Embedding from '@/models/Embedding';

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

    const queryVector = await createEmbedding(query);

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 100,
          limit: 5,
          filter: {
            projectId: new Types.ObjectId(projectId)
          }
        }
      },
      {
        $project: {
          content: 1,
          score: { $meta: "vectorSearchScore" },
          documentId: 1
        }
      }
    ];

    const results = await Embedding.aggregate(pipeline);
    return results;

  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}