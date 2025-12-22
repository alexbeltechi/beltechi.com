/**
 * Authentication Configuration
 * 
 * Uses NextAuth.js with Credentials provider.
 * Users are stored in content/users.json with hashed passwords.
 */

import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword, updateLastLogin } from "./cms/users";

// Extend the built-in types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

/**
 * NextAuth configuration options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Look up user by email
        const user = await getUserByEmail(credentials.email);
        
        if (!user) {
          console.log(`🚫 Login failed - user not found: ${credentials.email}`);
          return null;
        }
        
        // Verify password
        const isValid = await verifyPassword(user, credentials.password);
        
        if (!isValid) {
          console.log(`🚫 Login failed - wrong password: ${credentials.email}`);
          return null;
        }
        
        // Update last login time
        await updateLastLogin(user.id);
        
        console.log(`✅ Successful login: ${user.email}`);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }),
  ],

  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },

    /**
     * Session callback - runs when session is checked
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id || "";
        session.user.role = token.role;
      }
      return session;
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
