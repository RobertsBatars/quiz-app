import OpenAI from 'openai';
import Document from '@/models/Document';
import mongoose from 'mongoose';

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
  const queryEmbedding = await createEmbedding(query);
  
  const pipeline = [
    {
      $vectorSearch: {
        index: "default",
        path: "embeddings",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: 5
      }
    },
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(projectId),
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

  const results = await Document.aggregate(pipeline);
  return results;
}