/**
 * MongoDB Media Storage
 * 
 * Direct MongoDB operations for media items.
 * Each media item is stored as an individual document (WordPress-style).
 * 
 * This replaces the storage adapter pattern with proper MongoDB best practices.
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import type { MediaItem } from "@/lib/cms/types";

/**
 * List all media items with optional filtering and pagination
 */
export async function listMedia(options: {
  limit?: number;
  offset?: number;
  mime?: string;
  tags?: string[];
  sortBy?: "createdAt" | "filename" | "size";
  sortDir?: "asc" | "desc";
} = {}): Promise<{ items: MediaItem[]; total: number }> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  // Build filter - exclude old storage adapter documents
  const filter: Record<string, unknown> = {
    // Only get actual media documents (not the old index.json wrapper)
    id: { $exists: true },
  };

  if (options.mime) {
    filter.mime = { $regex: `^${options.mime}` };
  }

  if (options.tags && options.tags.length > 0) {
    filter.tags = { $in: options.tags };
  }

  // Get total count
  const total = await collection.countDocuments(filter);
  console.log("[DB/Media] Total documents matching filter:", total);

  // Build sort
  const sortField = options.sortBy || "createdAt";
  const sortDir = options.sortDir === "asc" ? 1 : -1;

  // Query with pagination
  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  const docs = await collection
    .find(filter)
    .sort({ [sortField]: sortDir })
    .skip(offset)
    .limit(limit)
    .toArray();

  // Clean MongoDB _id from results
  const items = docs.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as MediaItem;
  });

  return { items, total };
}

/**
 * Get a single media item by ID
 */
export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const doc = await collection.findOne({ id });
  if (!doc) return null;

  const { _id, ...media } = doc;
  return media as MediaItem;
}

/**
 * Get multiple media items by IDs
 */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  if (ids.length === 0) return [];

  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const docs = await collection.find({ id: { $in: ids } }).toArray();

  return docs.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as MediaItem;
  });
}

/**
 * Create a new media item
 */
export async function createMedia(media: MediaItem): Promise<MediaItem> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  // Insert the media document
  await collection.insertOne(media as unknown as Record<string, unknown>);

  return media;
}

/**
 * Update an existing media item
 */
export async function updateMedia(
  id: string,
  updates: Partial<Omit<MediaItem, "id">>
): Promise<MediaItem | null> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.findOneAndUpdate(
    { id },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    },
    { returnDocument: "after" }
  );

  if (!result) return null;

  const { _id, ...media } = result;
  return media as MediaItem;
}

/**
 * Delete a media item by ID
 */
export async function deleteMedia(id: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Delete multiple media items by IDs
 */
export async function deleteMediaByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.deleteMany({ id: { $in: ids } });
  return result.deletedCount;
}

/**
 * Bulk update media items (for batch operations like tagging)
 */
export async function bulkUpdateMedia(
  ids: string[],
  updates: Partial<Omit<MediaItem, "id">>
): Promise<number> {
  if (ids.length === 0) return 0;

  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const result = await collection.updateMany(
    { id: { $in: ids } },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    }
  );

  return result.modifiedCount;
}

/**
 * Search media by tags
 */
export async function searchMediaByTags(tags: string[]): Promise<MediaItem[]> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  const docs = await collection
    .find({ 
      tags: { $in: tags },
      id: { $exists: true } // Exclude old storage adapter docs
    })
    .toArray();

  return docs.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as MediaItem;
  });
}

/**
 * Get all used media IDs (referenced by entries)
 */
export async function getUsedMediaIds(): Promise<string[]> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  // Get all entries that have media
  const entries = await entriesCollection
    .find({ "data.media": { $exists: true, $ne: [] } })
    .project({ "data.media": 1 })
    .toArray();

  // Collect all unique media IDs
  const usedIds = new Set<string>();
  entries.forEach((entry) => {
    const mediaIds = entry.data?.media as string[] | undefined;
    if (mediaIds) {
      mediaIds.forEach((id) => usedIds.add(id));
    }
  });

  return Array.from(usedIds);
}

/**
 * Count total media items
 */
export async function countMedia(): Promise<number> {
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);

  return collection.countDocuments({ id: { $exists: true } });
}
