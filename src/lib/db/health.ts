/**
 * Database Health Check
 * 
 * Validates database connection on startup
 */

import { getDb } from "./mongodb";

/**
 * Test MongoDB connection
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (!process.env.MONGODB_URI) {
    return {
      connected: false,
      error: "MONGODB_URI not configured",
    };
  }

  try {
    const db = await getDb();
    await db.admin().ping();
    
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Log database connection status on startup
 */
export async function logDatabaseStatus(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.log("💾 Using filesystem storage (MONGODB_URI not set)");
    return;
  }

  const result = await checkDatabaseConnection();
  
  if (result.connected) {
    console.log("🍃 MongoDB connected successfully");
  } else {
    console.warn(`⚠️  MongoDB connection failed: ${result.error}`);
    console.warn("   Falling back to filesystem storage");
  }
}

