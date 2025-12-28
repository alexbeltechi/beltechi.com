/**
 * Startup Initialization
 * 
 * Runs database checks when the server starts
 * Import this file early in the application lifecycle
 */

import { logDatabaseStatus } from "./db/health";

// Run database status check on module load (server startup)
if (typeof window === "undefined") {
  // Only run on server-side
  logDatabaseStatus().catch((error) => {
    console.error("Failed to check database status:", error);
  });
}

export {};

