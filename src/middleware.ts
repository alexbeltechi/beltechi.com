/**
 * Next.js Middleware
 * 
 * Protects admin routes with NextAuth session check.
 * Unauthenticated users are redirected to login.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow these routes without authentication
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }
  
  // Check for valid session token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // No token = redirect to login
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// Apply middleware to admin routes and admin API routes
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
