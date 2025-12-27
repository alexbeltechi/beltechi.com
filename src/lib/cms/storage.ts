/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file operations.
 * - Development: Uses local filesystem
 * - Production: Uses GitHub API
 * 
 * This allows the CMS to work on Vercel (read-only filesystem)
 * by committing content changes via GitHub API.
 */

import { GitHubStorage } from './github';
import fs from 'fs/promises';
import path from 'path';

/**
 * Storage interface - all storage implementations must follow this contract
 */
export interface Storage {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string, message?: string): Promise<void>;
  delete(filePath: string, message?: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  list(dirPath: string): Promise<string[]>;
  ensureDir(dirPath: string): Promise<void>;
}

/**
 * Filesystem Storage - for local development
 */
class FilesystemStorage implements Storage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private resolve(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  async read(filePath: string): Promise<string> {
    const fullPath = this.resolve(filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async write(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    await fs.unlink(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolve(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(dirPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolve(dirPath);
      const files = await fs.readdir(fullPath);
      return files;
    } catch {
      return [];
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    const fullPath = this.resolve(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

/**
 * GitHub Storage Adapter - for production (Vercel)
 */
class GitHubStorageAdapter implements Storage {
  private github: GitHubStorage;

  constructor(token: string, repo: string, branch?: string) {
    this.github = new GitHubStorage(token, repo, branch);
  }

  async read(filePath: string): Promise<string> {
    const { content } = await this.github.readFile(filePath);
    return content;
  }

  async write(filePath: string, content: string, message?: string): Promise<void> {
    await this.github.writeFile(
      filePath,
      content,
      message || `Update ${filePath}`
    );
  }

  async delete(filePath: string, message?: string): Promise<void> {
    await this.github.deleteFile(
      filePath,
      message || `Delete ${filePath}`
    );
  }

  async exists(filePath: string): Promise<boolean> {
    return this.github.fileExists(filePath);
  }

  async list(dirPath: string): Promise<string[]> {
    return this.github.listDirectory(dirPath);
  }

  async ensureDir(dirPath: string): Promise<void> {
    await this.github.ensureDirectory(dirPath);
  }
}

/**
 * Storage singleton instance
 */
let storageInstance: Storage | null = null;

/**
 * Check if we should use GitHub storage
 */
function shouldUseGitHub(): boolean {
  // Use GitHub storage in production OR when explicitly configured
  const useGitHub = process.env.USE_GITHUB_STORAGE === 'true';
  const hasCredentials = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  const isProduction = process.env.NODE_ENV === 'production';
  
  return (isProduction || useGitHub) && hasCredentials;
}

/**
 * Create or get the storage instance
 */
export function getStorage(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  if (shouldUseGitHub()) {
    console.log('📡 Using GitHub API storage');
    storageInstance = new GitHubStorageAdapter(
      process.env.GITHUB_TOKEN!,
      process.env.GITHUB_REPO!,
      process.env.GITHUB_BRANCH || 'main'
    );
  } else {
    console.log('💾 Using filesystem storage');
    storageInstance = new FilesystemStorage(process.cwd());
  }

  return storageInstance;
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null;
}

/**
 * Create a storage instance with specific configuration
 * (Useful for migrations or scripts)
 */
export function createStorage(config: {
  type: 'filesystem' | 'github';
  basePath?: string;
  token?: string;
  repo?: string;
  branch?: string;
}): Storage {
  if (config.type === 'github') {
    if (!config.token || !config.repo) {
      throw new Error('GitHub storage requires token and repo');
    }
    return new GitHubStorageAdapter(config.token, config.repo, config.branch);
  }
  
  return new FilesystemStorage(config.basePath || process.cwd());
}



