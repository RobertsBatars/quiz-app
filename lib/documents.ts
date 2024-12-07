import { mkdir, readFile } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import Document from '@/models/Document';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const documentChunkSchema = new mongoose.Schema({
  content: { type: String, required: true },
  embeddings: {
    type: [Number],
    validate: {
      validator: function(v: number[]) {
        return !v || v.length === 1536;
      },
      message: 'Embeddings must be 1536-dimensional vectors'
    },
    required: true
  }
});

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  path: { type: String, required: true },
  chunks: [documentChunkSchema], // Array of chunks with their embeddings
  status: { type: String, enum: ['processing', 'completed', 'error'], default: 'processing' },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export async function ensureUploadDir(projectId: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads', projectId);
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

export async function moderateContent(text: string): Promise<{ flagged: boolean; reason?: string }> {
  try {
    // Call OpenAI moderation API
    const moderation = await openai.moderations.create({ input: text });
    const result = moderation.results[0];
    
    if (result.flagged) {
      // Get flagged categories and join them
      const categories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category)
        .join(', ');
      
      // Log moderation result
      console.log('Content moderation failed:', {
        flagged: true,
        categories,
        scores: result.category_scores
      });
      
      return {
        flagged: true,
        reason: `Content flagged for: ${categories}`
      };
    }

    // Content is safe
    return {
      flagged: false
    };

  } catch (error) {
    // Log error details
    console.error('Moderation API error:', error);
    
    // Re-throw with additional context
    throw new Error('Failed to moderate content: ' + (error as Error).message);
  }
}

export async function searchSimilarDocuments(text: string, projectId: string, limit: number = 5): Promise<any[]> {
  try {
    const embeddings = await generateEmbeddings(text);
    
    const documents = await Document.aggregate([
      {
        $vectorSearch: {
          queryVector: embeddings,
          path: "embeddings",
          numCandidates: limit * 2,
          limit: limit,
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
          content: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);
    
    return documents;
  } catch (error) {
    console.error('Error searching similar documents:', error);
    throw error;
  }
}