import '@testing-library/jest-dom';
import mongoose from 'mongoose';
import { TextEncoder, TextDecoder } from 'node:util';
import { URL } from 'node:url';

// Add TextEncoder and TextDecoder to global scope
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.URL === 'undefined') {
  global.URL = URL;
}

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    db: {
      collections: jest.fn().mockResolvedValue([]),
    },
  },
  Schema: jest.fn().mockReturnValue({
    pre: jest.fn().mockReturnThis(),
    index: jest.fn().mockReturnThis(),
  }),
  model: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  }),
  models: {},
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    auth: jest.fn(),
  })),
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      status: 'active'
    }
  })
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock mongodb client
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({
    db: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  }),
}));

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