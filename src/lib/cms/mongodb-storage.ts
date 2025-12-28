/**
 * MongoDB Storage Adapter
 * 
 * Implements the Storage interface using MongoDB instead of filesystem
 * This adapter makes MongoDB work as a drop-in replacement for file storage
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import type { Storage } from "./storage";

export class MongoDBStorage implements Storage {
  /**
   * Read a "file" (document) from MongoDB
   * File paths are used as document IDs
   */
  async read(filePath: string): Promise<string> {
    const db = await getDb();
    const collection = this.getCollectionForPath(filePath);
    const docId = this.pathToId(filePath);

    const doc = await db.collection(collection).findOne({ _filePath: docId });
    
    if (!doc) {
      throw new Error(`File not found: ${filePath}`);
    }

    return doc.content as string;
  }

  /**
   * Write a "file" (document) to MongoDB
   */
  async write(filePath: string, content: string, message?: string): Promise<void> {
    const db = await getDb();
    const collection = this.getCollectionForPath(filePath);
    const docId = this.pathToId(filePath);

    await db.collection(collection).updateOne(
      { _filePath: docId },
      {
        $set: {
          _filePath: docId,
          content,
          updatedAt: new Date().toISOString(),
          message,
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Delete a "file" (document) from MongoDB
   */
  async delete(filePath: string, message?: string): Promise<void> {
    const db = await getDb();
    const collection = this.getCollectionForPath(filePath);
    const docId = this.pathToId(filePath);

    await db.collection(collection).deleteOne({ _filePath: docId });
  }

  /**
   * Check if a "file" (document) exists
   */
  async exists(filePath: string): Promise<boolean> {
    const db = await getDb();
    const collection = this.getCollectionForPath(filePath);
    const docId = this.pathToId(filePath);

    const doc = await db.collection(collection).findOne({ _filePath: docId });
    return !!doc;
  }

  /**
   * List "files" (documents) in a "directory"
   */
  async list(dirPath: string): Promise<string[]> {
    const db = await getDb();
    const collection = this.getCollectionForPath(dirPath);
    
    // Find all documents with _filePath starting with dirPath
    const regex = new RegExp(`^${this.pathToId(dirPath)}/[^/]+$`);
    const docs = await db
      .collection(collection)
      .find({ _filePath: regex })
      .toArray();

    return docs.map((doc) => {
      const filePath = doc._filePath as string;
      return filePath.split('/').pop() || '';
    });
  }

  /**
   * Ensure directory exists (no-op for MongoDB)
   */
  async ensureDir(dirPath: string): Promise<void> {
    // No-op: MongoDB doesn't need directory creation
    return Promise.resolve();
  }

  /**
   * Helper: Convert file path to document ID
   */
  private pathToId(filePath: string): string {
    return filePath.replace(/^\//, '');
  }

  /**
   * Helper: Get MongoDB collection based on file path
   */
  private getCollectionForPath(filePath: string): string {
    if (filePath.includes('content/entries')) {
      return Collections.ENTRIES;
    }
    if (filePath.includes('content/media')) {
      return Collections.MEDIA;
    }
    if (filePath.includes('content/categories')) {
      return Collections.CATEGORIES;
    }
    if (filePath.includes('content/users')) {
      return Collections.USERS;
    }
    // Default collection for other files
    return 'files';
  }
}

