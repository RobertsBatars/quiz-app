import OpenAI from 'openai';
import { Types } from 'mongoose';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHUNK_SIZE = 1000;
const EMBEDDING_SIZE = 1536; // OpenAI ada-002 embedding size

// Type for valid embedding vector
type EmbeddingVector = number[] & { length: typeof EMBEDDING_SIZE };

function validateEmbedding(arr: number[]): arr is EmbeddingVector {
  return arr.length === EMBEDDING_SIZE && arr.every(n => typeof n === 'number');
}

function chunkText(text: string): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > CHUNK_SIZE) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentLength = word.length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

export async function generateEmbeddings(input: string | string[]): Promise<EmbeddingVector> {
  try {
    const chunks = typeof input === 'string' ? 
      chunkText(input) : 
      input.flatMap(text => chunkText(text));

    const embeddings = await generateBatchEmbeddings(chunks);
    
    // For document storage, use first chunk's embedding
    return embeddings[0];
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

export async function generateBatchEmbeddings(inputs: string[]): Promise<EmbeddingVector[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: inputs,
      encoding_format: "float",
    });

    const embeddings = response.data.map(item => item.embedding);
    
    // Validate embeddings
    if (!embeddings.every(validateEmbedding)) {
      throw new Error('Invalid embedding dimensions received from API');
    }

    return embeddings as EmbeddingVector[];
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}

export async function compareEmbeddings(embedding1: EmbeddingVector, embedding2: EmbeddingVector): Promise<number> {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < EMBEDDING_SIZE; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}