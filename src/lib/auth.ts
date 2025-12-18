/**
 * Authentication Configuration
 * 
 * Uses NextAuth.js with GitHub OAuth provider.
 * The GitHub token from auth is used for content storage via GitHub API.
 */

import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";

// Extend the built-in types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string; // GitHub username
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    login?: string;
  }
}

/**
 * List of GitHub usernames allowed to access admin
 * In production, this should come from environment or database
 */
const ALLOWED_USERS = process.env.ALLOWED_ADMIN_USERS?.split(",").map((u) =>
  u.trim().toLowerCase()
) || [];

/**
 * Check if a user is authorized to access admin
 */
export function isAuthorizedUser(login?: string | null): boolean {
  if (!login) return false;
  
  // If no allowed users configured, allow anyone with GitHub auth
  // This is for development convenience
  if (ALLOWED_USERS.length === 0) {
    console.warn("⚠️  No ALLOWED_ADMIN_USERS configured - allowing all authenticated users");
    return true;
  }
  
  return ALLOWED_USERS.includes(login.toLowerCase());
}

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request repo scope for content storage
          scope: "read:user user:email repo",
        },
      },
    }),
  ],

  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     */
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        token.accessToken = account.access_token;
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },

    /**
     * Session callback - runs when session is checked
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add access token and GitHub username to session
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.login = token.login;
      }
      return session;
    },

    /**
     * Sign in callback - control who can sign in
     */
    async signIn({ profile }) {
      const login = (profile as { login?: string })?.login;
      
      // Check if user is authorized
      if (!isAuthorizedUser(login)) {
        console.log(`🚫 Unauthorized login attempt: ${login}`);
        return false;
      }
      
      console.log(`✅ Authorized login: ${login}`);
      return true;
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * Helper to get GitHub token from session for API calls
 */
export function getGitHubToken(session: Session | null): string | null {
  return session?.accessToken || process.env.GITHUB_TOKEN || null;
}


