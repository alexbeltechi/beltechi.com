/**
 * GitHub API Storage
 * 
 * Handles reading/writing content files via GitHub's API.
 * Used in production (Vercel) where filesystem is read-only.
 */

import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  content: string;
  sha: string;
  path: string;
}

export class GitHubStorage {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(token: string, repoFullName: string, branch = 'main') {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repoFullName.split('/');
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Read a file from the repository
   */
  async readFile(filePath: string): Promise<GitHubFile> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch,
      });

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
        path: filePath,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write a file to the repository (create or update)
   */
  async writeFile(
    filePath: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<void> {
    // Get current SHA if not provided (needed for updates)
    if (!sha) {
      try {
        const existing = await this.readFile(filePath);
        sha = existing.sha;
      } catch {
        // File doesn't exist, that's fine for creates
      }
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message,
      content: Buffer.from(content).toString('base64'),
      branch: this.branch,
      ...(sha && { sha }),
    });
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(filePath: string, message: string): Promise<void> {
    const { sha } = await this.readFile(filePath);

    await this.octokit.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message,
      sha,
      branch: this.branch,
    });
  }

  /**
   * List files in a directory
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: dirPath,
        ref: this.branch,
      });

      if (!Array.isArray(data)) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }

      return data
        .filter((item) => item.type === 'file')
        .map((item) => item.name);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return []; // Directory doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Create a directory by creating a .gitkeep file
   * (GitHub doesn't support empty directories)
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    const gitkeepPath = `${dirPath}/.gitkeep`;
    const exists = await this.fileExists(gitkeepPath);
    
    if (!exists) {
      try {
        await this.writeFile(
          gitkeepPath,
          '',
          `Create directory: ${dirPath}`
        );
      } catch {
        // Directory might already have files, that's fine
      }
    }
  }
}

