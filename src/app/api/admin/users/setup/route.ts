/**
 * First-time setup - Create initial admin user
 * POST /api/admin/users/setup
 * 
 * Only works when no users exist yet.
 * Creates the first user with "owner" role.
 */

import { NextRequest, NextResponse } from "next/server";
import { hasUsers, createUser } from "@/lib/cms/users";

export async function POST(request: NextRequest) {
  try {
    // Check if users already exist
    const exists = await hasUsers();
    if (exists) {
      return NextResponse.json(
        { error: "Setup already complete" },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name, email, password } = body;
    
    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    
    // Create the first user as owner
    const result = await createUser({
      name,
      email,
      password,
      role: "owner",
    });
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

