/**
 * MongoDB Users Storage
 * 
 * Stores user data in MongoDB instead of JSON files
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "owner" | "admin" | "editor";
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

/**
 * List all users
 */
export async function listUsers(): Promise<Omit<User, "passwordHash">[]> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  const users = await usersCollection.find({}).toArray();
  
  return users.map(({ passwordHash, ...user }) => user) as Omit<User, "passwordHash">[];
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<Omit<User, "passwordHash"> | null> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  const user = await usersCollection.findOne({ id });
  if (!user) return null;
  
  const { passwordHash, ...safeUser } = user as unknown as User;
  return safeUser;
}

/**
 * Get user by email (with password hash for auth)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  const user = await usersCollection.findOne({ 
    email: email.toLowerCase() 
  });
  
  return user as unknown as User | null;
}

/**
 * Create user
 */
export async function createUser(user: User): Promise<User> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  await usersCollection.insertOne(user as unknown as Record<string, unknown>);
  
  return user;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  const now = new Date().toISOString();
  const updateDoc = {
    ...updates,
    updatedAt: now,
  };

  await usersCollection.updateOne(
    { id },
    { $set: updateDoc }
  );

  const user = await usersCollection.findOne({ id });
  if (!user) {
    throw new Error(`User not found: ${id}`);
  }

  return user as unknown as User;
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  await usersCollection.deleteOne({ id });
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(id: string): Promise<void> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  await usersCollection.updateOne(
    { id },
    { $set: { lastLoginAt: new Date().toISOString() } }
  );
}

/**
 * Check if any users exist
 */
export async function hasUsers(): Promise<boolean> {
  const db = await getDb();
  const usersCollection = db.collection(Collections.USERS);

  const count = await usersCollection.countDocuments();
  return count > 0;
}

