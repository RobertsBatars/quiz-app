// scripts/migrate-db.ts
import { MongoClient, CreateCollectionOptions } from 'mongodb';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), 'db-backup');
const DB_NAME = 'quiz-app';

async function createRegularCollection(db: any, name: string) {
  try {
    const options: CreateCollectionOptions = {
      capped: false, // Ensure it's not capped
      timeseries: undefined // Explicitly prevent timeseries
    };
    
    await db.createCollection(name, options);
    console.log(`Created regular collection: ${name}`);
  } catch (error) {
    if ((error as any).code !== 48) { // Ignore "collection already exists"
      throw error;
    }
  }
}

async function dropTimeSeriesCollections(db: any) {
  const collections = ['users', 'documents', 'quizzes', 'responses', 'projects'];
  for (const collection of collections) {
    try {
      const collInfo = await db.listCollections({ name: collection }).next();
      if (collInfo?.options?.timeseries) {
        console.log(`Dropping time-series collection: ${collection}`);
        await db.dropCollection(collection);
      }
    } catch (e) {
      // Collection might not exist
    }
  }
}

async function migrate() {
  if (!process.env.MONGODB_URI || !process.env.NEW_MONGODB_URI) {
    throw new Error('MONGODB_URI and NEW_MONGODB_URI required in .env.local');
  }

  console.log('Starting migration...');

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Connect to both clusters
    const sourceClient = await MongoClient.connect(process.env.MONGODB_URI);
    const targetClient = await MongoClient.connect(process.env.NEW_MONGODB_URI);

    const sourceDb = sourceClient.db(DB_NAME);
    const targetDb = targetClient.db(DB_NAME);

    // Backup source database
    console.log('Creating backup...');
    await execAsync(`mongodump --uri="${process.env.MONGODB_URI}" --db=${DB_NAME} --out="${BACKUP_DIR}"`);

    // Drop existing collections on target
    const collections = ['users', 'documents', 'quizzes', 'responses', 'projects'];
    for (const collection of collections) {
      try {
        await targetDb.dropCollection(collection);
      } catch (e) {
        // Ignore if collection doesn't exist
      }
    }

    // Create regular collections on target
    for (const collection of collections) {
      await createRegularCollection(targetDb, collection);
    }

    // Restore data to regular collections
    for (const collection of collections) {
      console.log(`Migrating collection: ${collection}`);
      await execAsync(
        `mongorestore --uri="${process.env.NEW_MONGODB_URI}" --db=${DB_NAME} --collection=${collection} "${BACKUP_DIR}/${DB_NAME}/${collection}.bson"`
      );

      // Recreate indexes
      const indexes = await sourceDb.collection(collection).indexes();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          // Clean up index options
          const indexOptions = {
            name: index.name,
            background: true,
            ...((index.unique === true) && { unique: true }),
            ...((index.sparse === true) && { sparse: true }),
            ...(index.vectorSearchOptions && {
              vectorSearchOptions: index.vectorSearchOptions
            })
          };

          await targetDb.collection(collection).createIndex(
            index.key,
            indexOptions
          );
        }
      }
    }

    // Verify counts
    let success = true;
    for (const collection of collections) {
      const sourceCount = await sourceDb.collection(collection).countDocuments();
      const targetCount = await targetDb.collection(collection).countDocuments();
      const targetInfo = await targetDb.listCollections({ name: collection }).next();

      console.log(`Collection ${collection}:`, {
        sourceCount,
        targetCount,
        isTimeseries: (targetInfo as any)?.options?.timeseries ? 'yes' : 'no'
      });

      if (sourceCount !== targetCount || (targetInfo as any)?.options?.timeseries) {
        success = false;
      }
    }

    if (!success) {
      throw new Error('Migration verification failed');
    }

    console.log('Migration completed successfully');
    await sourceClient.close();
    await targetClient.close();
    await fs.rm(BACKUP_DIR, { recursive: true, force: true });

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate().catch(console.error);