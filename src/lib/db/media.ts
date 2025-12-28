/**
 * MongoDB Media Storage
 * 
 * Stores media metadata in MongoDB
 * Actual files stay in /public/uploads/
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import type { MediaItem } from "@/lib/cms/types";
import { ObjectId } from "mongodb";

/**
 * List all media items
 */
export async function listMedia(): Promise<MediaItem[]> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  const media = await mediaCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return media as unknown as MediaItem[];
}

/**
 * Get media item by ID
 */
export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  const media = await mediaCollection.findOne({ id });
  return media as unknown as MediaItem | null;
}

/**
 * Get multiple media items by IDs
 */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  const media = await mediaCollection
    .find({ id: { $in: ids } })
    .toArray();

  return media as unknown as MediaItem[];
}

/**
 * Create media item
 */
export async function createMedia(
  data: Omit<MediaItem, "id" | "createdAt">
): Promise<MediaItem> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  const now = new Date().toISOString();
  const media = {
    ...data,
    id: new ObjectId().toString(),
    createdAt: now,
  };

  await mediaCollection.insertOne(media as unknown as Record<string, unknown>);

  return media as MediaItem;
}

/**
 * Update media item
 */
export async function updateMedia(
  id: string,
  updates: Partial<MediaItem>
): Promise<MediaItem> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  const now = new Date().toISOString();
  const updateDoc = {
    ...updates,
    updatedAt: now,
  };

  await mediaCollection.updateOne(
    { id },
    { $set: updateDoc }
  );

  const media = await mediaCollection.findOne({ id });
  if (!media) {
    throw new Error(`Media not found: ${id}`);
  }

  return media as unknown as MediaItem;
}

/**
 * Delete media item
 */
export async function deleteMedia(id: string): Promise<void> {
  const db = await getDb();
  const mediaCollection = db.collection(Collections.MEDIA);

  await mediaCollection.deleteOne({ id });
}

