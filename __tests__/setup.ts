import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Fix for TextEncoder/TextDecoder not defined
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util');
global.TextEncoder = NodeTextEncoder;
global.TextDecoder = NodeTextDecoder;

// Fix for URL not defined
const { URL } = require('url');
global.URL = URL;

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0) }]
      })
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    }
  }))
}));