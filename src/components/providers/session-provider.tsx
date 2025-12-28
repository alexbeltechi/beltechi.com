"use client";

/**
 * NextAuth Session Provider
 * 
 * Wraps the application with session context for authentication state.
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}




