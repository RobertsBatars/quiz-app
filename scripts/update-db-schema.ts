import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

async function updateSchema() {
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db('quiz-app');

  // Create collections if they don't exist
  const collections = ['users', 'documents', 'quizzes', 'questions', 'responses', 'projects'];
  for (const collection of collections) {
    const exists = await db.listCollections({ name: collection }).hasNext();
    if (!exists) {
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

  // Update Documents collection
  await db.command({
    collMod: 'documents',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'projectId', 'fileName', 'fileType', 'status'],
        properties: {
          userId: { bsonType: 'string' },
          projectId: { bsonType: 'string' },
          fileName: { bsonType: 'string' },
          fileType: { bsonType: 'string' },
          fileSize: { bsonType: 'int' },
          path: { bsonType: 'string' },
          embeddings: { bsonType: 'array' },
          status: { enum: ['processing', 'completed', 'error'] },
          moderationStatus: { enum: ['pending', 'approved', 'rejected'] }
        }
      }
    }
  });

  // Update Quizzes collection
  await db.command({
    collMod: 'quizzes',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'projectId', 'title', 'type', 'status'],
        properties: {
          userId: { bsonType: 'string' },
          projectId: { bsonType: 'string' },
          title: { bsonType: 'string' },
          description: { bsonType: 'string' },
          type: { enum: ['multiple-choice', 'open-ended', 'flashcard', 'oral'] },
          questions: { bsonType: 'array' },
          timeLimit: { bsonType: 'int' },
          passingScore: { bsonType: 'int' },
          status: { enum: ['draft', 'published', 'archived'] }
        }
      }
    }
  });

  // Update Questions collection
  await db.command({
    collMod: 'questions',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['quizId', 'type', 'question'],
        properties: {
          quizId: { bsonType: 'string' },
          type: { enum: ['multiple-choice', 'open-ended', 'flashcard'] },
          question: { bsonType: 'string' },
          options: { bsonType: 'array' },
          correctAnswer: { bsonType: 'string' },
          explanation: { bsonType: 'string' },
          points: { bsonType: 'int' },
          aiRubric: { bsonType: 'object' }
        }
      }
    }
  });

  // Update Responses collection
  await db.command({
    collMod: 'responses',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'quizId', 'status'],
        properties: {
          userId: { bsonType: 'string' },
          quizId: { bsonType: 'string' },
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
          userId: { bsonType: 'string' },
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

  // Create indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('documents').createIndex({ userId: 1, projectId: 1 });
  await db.collection('quizzes').createIndex({ userId: 1, projectId: 1 });
  await db.collection('questions').createIndex({ quizId: 1 });
  await db.collection('responses').createIndex({ userId: 1, quizId: 1 });
  await db.collection('projects').createIndex({ userId: 1 });

  console.log('Database schema updated successfully');
  await client.close();
}

updateSchema().catch(console.error);