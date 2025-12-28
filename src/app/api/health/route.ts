/**
 * Health Check API
 * 
 * GET /api/health
 * Returns database connection status
 */

import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/health";

export async function GET() {
  const dbStatus = await checkDatabaseConnection();
  
  const health = {
    status: dbStatus.connected ? "healthy" : "unhealthy",
    database: dbStatus.connected ? "connected" : "disconnected",
    error: dbStatus.error || null,
    timestamp: new Date().toISOString(),
  };

  const status = dbStatus.connected ? 200 : 503;

  return NextResponse.json(health, { status });
}

