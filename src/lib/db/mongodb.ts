/**
 * MongoDB Connection
 * 
 * Singleton connection pattern for Next.js
 * Handles connection pooling and reuse in serverless environment
 */

import { MongoClient, Db } from "mongodb";

const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10, // Limit connection pool size
  minPoolSize: 1, // Keep at least 1 connection alive
  maxIdleTimeMS: 10000, // Close idle connections after 10s
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Global variable to preserve connection across HMR in development
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient> | null;
};

/**
 * Get MongoDB URI from environment
 */
function getMongoURI(): string {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local");
  }
  return process.env.MONGODB_URI;
}

/**
 * Get MongoDB client
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoURI();

  // In development, use global variable to preserve connection across HMR
  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  }

  // In production, create a new client for each request
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

/**
 * Get database instance
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(); // Uses database from connection string
}

/**
 * Collection names
 */
export const Collections = {
  ENTRIES: "entries",
  MEDIA: "media",
  CATEGORIES: "categories",
  USERS: "users",
} as const;
