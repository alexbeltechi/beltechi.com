/**
 * API Error Handler Utility
 * 
 * Provides consistent error handling for MongoDB errors
 */

import { NextResponse } from "next/server";

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: string;
}

/**
 * Wrap API handler with MongoDB error handling
 */
export function handleDatabaseError(error: unknown): NextResponse<ErrorResponse> {
  console.error("Database error:", error);

  const timestamp = new Date().toISOString();

  // MongoDB connection errors
  if (error instanceof Error) {
    // Connection timeout
    if (error.message.includes("ENOTFOUND") || error.message.includes("querySrv")) {
      return NextResponse.json(
        {
          error: "Database Connection Failed",
          message: "Unable to connect to MongoDB. Please check your MONGODB_URI configuration.",
          code: "DB_CONNECTION_ERROR",
          timestamp,
        },
        { status: 503 }
      );
    }

    // Authentication error
    if (error.message.includes("Authentication failed")) {
      return NextResponse.json(
        {
          error: "Database Authentication Failed",
          message: "MongoDB authentication failed. Please check your credentials.",
          code: "DB_AUTH_ERROR",
          timestamp,
        },
        { status: 503 }
      );
    }

    // Network timeout
    if (error.message.includes("timed out")) {
      return NextResponse.json(
        {
          error: "Database Timeout",
          message: "Database operation timed out. Please try again.",
          code: "DB_TIMEOUT",
          timestamp,
        },
        { status: 504 }
      );
    }

    // MongoDB URI not configured
    if (error.message.includes("MONGODB_URI is required")) {
      return NextResponse.json(
        {
          error: "Database Not Configured",
          message: "MONGODB_URI environment variable is not set. Please configure your database connection.",
          code: "DB_NOT_CONFIGURED",
          timestamp,
        },
        { status: 500 }
      );
    }
  }

  // Generic database error
  return NextResponse.json(
    {
      error: "Database Error",
      message: "An unexpected database error occurred. Please try again.",
      code: "DB_ERROR",
      timestamp,
    },
    { status: 500 }
  );
}

/**
 * Check if error is database-related
 */
export function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const dbErrorPatterns = [
    "ENOTFOUND",
    "querySrv",
    "MONGODB_URI",
    "Authentication failed",
    "timed out",
    "connection",
    "MongoError",
  ];

  return dbErrorPatterns.some((pattern) =>
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

