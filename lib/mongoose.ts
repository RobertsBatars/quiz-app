import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: GlobalMongoose | undefined
}

const cached = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'quiz-app',
      serverApi: {
        version: "1" as "1",
        strict: false, // Change this to false to allow vector search
        deprecationErrors: true,
      }
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts)
  }

  try {
    cached.conn = await cached.promise
    if (mongoose.connection.db) {
      console.log('🔌 Connected to database:', mongoose.connection.db.databaseName)
    }
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}