import { config } from 'dotenv'
import { resolve } from 'path'
import { MongoClient, ServerApiVersion } from 'mongodb'
import bcrypt from 'bcryptjs'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

async function main() {
  try {
    const client = new MongoClient(MONGODB_URI as string, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    })

    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db('quiz-app')
    const users = db.collection('users')

    // Create admin user if it doesn't exist
    const adminEmail = 'admin@example.com'
    const existingAdmin = await users.findOne({ email: adminEmail })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      await users.insertOne({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        projects: [],
        uploadedFiles: [],
        quizzes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('Admin user created successfully')
    } else {
      console.log('Admin user already exists')
    }

    // Create test user if it doesn't exist
    const testEmail = 'test@example.com'
    const existingTest = await users.findOne({ email: testEmail })

    if (!existingTest) {
      const hashedPassword = await bcrypt.hash('test123', 12)
      await users.insertOne({
        email: testEmail,
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
        isActive: true,
        projects: [],
        uploadedFiles: [],
        quizzes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('Test user created successfully')
    } else {
      console.log('Test user already exists')
    }

    console.log('Database initialization completed')
    await client.close()
  } catch (error) {
    console.error('Database initialization failed:', error)
  } finally {
    process.exit()
  }
}

main()