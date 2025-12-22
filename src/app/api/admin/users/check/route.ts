/**
 * Check if any users exist
 * GET /api/admin/users/check
 * 
 * Used by setup page to determine if first-time setup is needed.
 * No authentication required.
 */

import { NextResponse } from "next/server";
import { hasUsers } from "@/lib/cms/users";

export async function GET() {
  try {
    const exists = await hasUsers();
    return NextResponse.json({ hasUsers: exists });
  } catch (error) {
    console.error("Failed to check users:", error);
    return NextResponse.json(
      { error: "Failed to check users" },
      { status: 500 }
    );
  }
}

