import { mkdir } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document } from '@/models/Document';
import { Types } from 'mongoose';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function ensureUploadDir(projectId: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads', projectId);
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  try {
    if (fileType === 'application/pdf') {
      const dataBuffer = await readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (fileType === 'text/plain') {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
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
    const moderation = await openai.moderations.create({ input: text });
    const result = moderation.results[0];
    
    if (result.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category)
        .join(', ');
      
      return {
        flagged: true,
        reason: `Content flagged for: ${categories}`
      };
    }
    
    return { flagged: false };
  } catch (error) {
    console.error('Error moderating content:', error);
    throw error;
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