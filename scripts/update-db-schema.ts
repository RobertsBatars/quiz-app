import { MongoClient, CreateIndexesOptions } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const EMBEDDING_SIZE = 1536;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface VectorSearchOptions {
  numDimensions: number;
  similarity: "euclidean" | "cosine" | "dotProduct";
}

interface VectorIndexDescription extends IndexDescription {
  vectorSearchOptions?: VectorSearchOptions;
}

async function updateSchema() {
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db('quiz-app');

  // Create collections if they don't exist
  const collections = ['users', 'documents', 'quizzes', 'responses', 'projects'];
  for (const collection of collections) {
    const exists = await db.listCollections({ name: collection }).hasNext();
    if (!exists) {
      // Create regular collection instead of time-series
      await db.createCollection(collection);
    }
  }

  // Update Users collection
  await db.command({
    collMod: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'name', 'role', 'status'],
        properties: {
          email: { bsonType: 'string' },
          password: { bsonType: 'string' },
          name: { bsonType: 'string' },
          role: { enum: ['user', 'admin'] },
          status: { enum: ['active', 'banned', 'deleted'] },
          lastLogin: { bsonType: 'date' },
          loginAttempts: { bsonType: 'int' },
          lockUntil: { bsonType: 'date' },
          settings: {
            bsonType: 'object',
            properties: {
              emailNotifications: { bsonType: 'bool' },
              twoFactorEnabled: { bsonType: 'bool' },
              theme: { bsonType: 'string' }
            }
          }
        }
      }
    }
  });

  // Update Documents collection with vector validation
  await db.command({
    collMod: 'documents',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'projectId', 'fileName', 'fileType', 'status', 'embeddings'],
        properties: {
          userId: { bsonType: 'objectId' },
          projectId: { bsonType: 'objectId' },
          fileName: { bsonType: 'string' },
          fileType: { bsonType: 'string' },
          fileSize: { bsonType: 'int' },
          path: { bsonType: 'string' },
          content: { bsonType: 'string' },
          embeddings: { 
            bsonType: 'array',
            minItems: EMBEDDING_SIZE,
            maxItems: EMBEDDING_SIZE,
            items: { bsonType: 'double' }
          },
          status: { enum: ['processing', 'completed', 'error'] },
          moderationStatus: { enum: ['pending', 'approved', 'rejected'] },
          moderationReason: { bsonType: 'string' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });

  // Drop existing vector index if exists
  try {
    await db.collection('documents').dropIndex("vector_index");
  } catch (e) {
    // Index might not exist
  }

  // Create vector search index with proper typing
  const vectorIndex = {
    key: {
      embeddings: 1,
      projectId: 1,
      status: 1,
      moderationStatus: 1
    },
    name: "vector_index",
    vectorSearchOptions: {
      numDimensions: EMBEDDING_SIZE,
      similarity: "euclidean" as const
    }
  } as VectorIndexDescription;

  await db.collection('documents').createIndex(
    vectorIndex.key,
    {
      name: vectorIndex.name,
      background: true,
      ...vectorIndex.vectorSearchOptions && {
        vectorSearchOptions: vectorIndex.vectorSearchOptions
      }
    } as CreateIndexesOptions & { 
      vectorSearchOptions?: VectorSearchOptions 
    }
  );

  console.log('Vector search index created successfully');

  // Update Quizzes collection
  await db.command({
    collMod: 'quizzes',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'projectId', 'title', 'type', 'status'],
        properties: {
          userId: { bsonType: 'objectId' },
          projectId: { bsonType: 'objectId' },
          title: { bsonType: 'string' },
          description: { bsonType: 'string' },
          type: { enum: ['multiple-choice', 'open-ended', 'flash-cards', 'oral-exam'] },
          questions: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['question', 'type'],
              properties: {
                question: { bsonType: 'string' },
                type: { enum: ['multiple-choice', 'open-ended', 'flashcard'] },
                options: { 
                  bsonType: 'array',
                  items: { bsonType: 'string' }
                },
                correctAnswer: { bsonType: 'string' },
                explanation: { bsonType: 'string' },
                aiRubric: { 
                  bsonType: 'object',
                  properties: {
                    keyPoints: {
                      bsonType: 'array',
                      items: { bsonType: 'string' }
                    },
                    scoringCriteria: { bsonType: 'string' }
                  }
                }
              }
            }
          },
          timeLimit: { bsonType: 'int' },
          passingScore: { bsonType: 'int' },
          status: { enum: ['draft', 'published', 'archived'] }
        }
      }
    }
  });

  // Remove Questions collection since questions are now embedded
  await db.dropCollection('questions');

  // Update Responses collection
  await db.command({
    collMod: 'responses',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'quizId', 'status'],
        properties: {
          userId: { bsonType: 'objectId' },
          quizId: { bsonType: 'objectId' },
          answers: { bsonType: 'array' },
          totalScore: { bsonType: 'int' },
          percentageScore: { bsonType: 'double' },
          startTime: { bsonType: 'date' },
          endTime: { bsonType: 'date' },
          status: { enum: ['in-progress', 'completed', 'abandoned'] }
        }
      }
    }
  });

  // Update Projects collection
  await db.command({
    collMod: 'projects',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'name'],
        properties: {
          userId: { bsonType: 'objectId' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string' },
          documents: { bsonType: 'array' },
          quizzes: { bsonType: 'array' },
          collaborators: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['userId', 'role'],
              properties: {
                userId: { bsonType: 'string' },
                role: { enum: ['viewer', 'editor', 'admin'] }
              }
            }
          },
          settings: { bsonType: 'object' }
        }
      }
    }
  });

  // Create indexes with timestamps
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ createdAt: 1 });
  
  await db.collection('documents').createIndex({ userId: 1, projectId: 1 });
  await db.collection('documents').createIndex({ createdAt: 1 });
  
  await db.collection('quizzes').createIndex({ userId: 1, projectId: 1 });
  await db.collection('quizzes').createIndex({ createdAt: 1 });
  
  await db.collection('responses').createIndex({ userId: 1, quizId: 1 });
  await db.collection('responses').createIndex({ createdAt: 1 });
  
  await db.collection('projects').createIndex({ userId: 1 });
  await db.collection('projects').createIndex({ createdAt: 1 });

  // Add timestamps to all collections
  for (const collection of collections) {
    await db.command({
      collMod: collection,
      validator: {
        $jsonSchema: {
          required: ["createdAt", "updatedAt"],
          properties: {
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });
  }

  console.log('Database schema updated successfully');
  await client.close();
}

updateSchema().catch(console.error);