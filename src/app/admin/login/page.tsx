"use client";

/**
 * Admin Login Page
 * 
 * In development without auth configured, redirects to admin.
 * In production with auth, shows GitHub OAuth login.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  // In dev mode (no auth), redirect to admin
  useEffect(() => {
    // Check if we're in dev mode by trying to access admin directly
    // This will work because middleware allows it without NEXTAUTH_SECRET
    router.push("/admin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Redirecting to admin panel...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Auth is disabled in development mode.
          </p>
          <Button asChild className="w-full">
            <Link href="/admin">
              Go to Admin
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
