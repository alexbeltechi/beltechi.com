/**
 * Storage Abstraction Layer - MongoDB Only
 * 
 * Provides MongoDB storage interface.
 * No filesystem or GitHub fallbacks.
 */

import { MongoDBStorage } from './mongodb-storage';

/**
 * Storage interface
 */
export interface Storage {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string, message?: string): Promise<void>;
  delete(filePath: string, message?: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  list(dirPath: string): Promise<string[]>;
  ensureDir(dirPath: string): Promise<void>;
}

/**
 * Storage singleton instance
 */
let storageInstance: Storage | null = null;

/**
 * Check if MongoDB is configured
 */
function ensureMongoDBConfigured(): void {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required. Please add it to your .env.local file.\n" +
      "Get your connection string from MongoDB Atlas: https://cloud.mongodb.com\n\n" +
      "Example:\n" +
      "MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname"
    );
  }
}

/**
 * Create or get the storage instance
 */
export function getStorage(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  ensureMongoDBConfigured();
  
  console.log('🍃 Using MongoDB storage');
  storageInstance = new MongoDBStorage();

  return storageInstance;
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null;
}
