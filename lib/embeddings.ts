import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(input: string | string[]): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

export async function generateBatchEmbeddings(inputs: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: inputs,
      encoding_format: "float",
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}

export async function compareEmbeddings(embedding1: number[], embedding2: number[]): Promise<number> {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}