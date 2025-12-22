/**
 * User Management
 * 
 * Stores users in content/users.json with hashed passwords.
 * Uses bcryptjs for password hashing.
 */

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getStorage } from "./storage";

// Path to users file
const USERS_PATH = "content/users.json";

// User roles
export type UserRole = "owner" | "admin" | "editor";

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// User without password (for client-side)
export type SafeUser = Omit<User, "passwordHash">;

// Users file structure
interface UsersFile {
  users: User[];
}

/**
 * Load users from storage
 */
async function loadUsers(): Promise<UsersFile> {
  const storage = getStorage();
  
  try {
    const content = await storage.read(USERS_PATH);
    return JSON.parse(content) as UsersFile;
  } catch {
    // File doesn't exist yet
    return { users: [] };
  }
}

/**
 * Save users to storage
 */
async function saveUsers(data: UsersFile, message?: string): Promise<void> {
  const storage = getStorage();
  await storage.write(
    USERS_PATH,
    JSON.stringify(data, null, 2),
    message || "Update users"
  );
}

/**
 * Check if any users exist (for first-time setup)
 */
export async function hasUsers(): Promise<boolean> {
  const data = await loadUsers();
  return data.users.length > 0;
}

/**
 * Get all users (without passwords)
 */
export async function listUsers(): Promise<SafeUser[]> {
  const data = await loadUsers();
  return data.users.map(({ passwordHash, ...user }) => user);
}

/**
 * Get user by ID (without password)
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  const data = await loadUsers();
  const user = data.users.find((u) => u.id === id);
  if (!user) return null;
  
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Get user by email (with password hash for auth)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const data = await loadUsers();
  return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Verify user password
 */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Create a new user
 */
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}): Promise<{ user?: SafeUser; error?: string }> {
  const data = await loadUsers();
  
  // Check if email already exists
  const existing = data.users.find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase()
  );
  if (existing) {
    return { error: "Email already in use" };
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);
  
  // Create user
  const user: User = {
    id: `user_${nanoid(12)}`,
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  
  data.users.push(user);
  await saveUsers(data, `Create user: ${user.email}`);
  
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser };
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }
): Promise<{ user?: SafeUser; error?: string }> {
  const data = await loadUsers();
  const index = data.users.findIndex((u) => u.id === id);
  
  if (index === -1) {
    return { error: "User not found" };
  }
  
  // Check email uniqueness if changing email
  if (updates.email) {
    const existing = data.users.find(
      (u) => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== id
    );
    if (existing) {
      return { error: "Email already in use" };
    }
    data.users[index].email = updates.email.toLowerCase();
  }
  
  if (updates.name) {
    data.users[index].name = updates.name;
  }
  
  if (updates.role) {
    data.users[index].role = updates.role;
  }
  
  if (updates.password) {
    data.users[index].passwordHash = await bcrypt.hash(updates.password, 10);
  }
  
  data.users[index].updatedAt = new Date().toISOString();
  
  await saveUsers(data, `Update user: ${data.users[index].email}`);
  
  const { passwordHash, ...safeUser } = data.users[index];
  return { user: safeUser };
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const data = await loadUsers();
  const index = data.users.findIndex((u) => u.id === id);
  
  if (index === -1) {
    return { success: false, error: "User not found" };
  }
  
  // Prevent deleting last owner
  const user = data.users[index];
  if (user.role === "owner") {
    const ownerCount = data.users.filter((u) => u.role === "owner").length;
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot delete the last owner" };
    }
  }
  
  const email = data.users[index].email;
  data.users.splice(index, 1);
  await saveUsers(data, `Delete user: ${email}`);
  
  return { success: true };
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(id: string): Promise<void> {
  const data = await loadUsers();
  const user = data.users.find((u) => u.id === id);
  
  if (user) {
    user.lastLoginAt = new Date().toISOString();
    await saveUsers(data);
  }
}

