/**
 * Next.js Middleware
 * 
 * Protects admin routes with NextAuth session check.
 * Setup page is always accessible for first-time setup.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow these routes without authentication:
  // - Login page
  // - Setup page (first-time setup)
  // - Auth API routes
  // - User check API (needed by setup page)
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/setup" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/admin/users/check" ||
    pathname === "/api/admin/users/setup"
  ) {
    return NextResponse.next();
  }
  
  // Check for valid session token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // No token = redirect to login
  // Login page will check if setup is needed
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// Apply middleware to admin routes only
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
